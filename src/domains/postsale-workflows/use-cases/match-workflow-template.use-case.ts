import { Inject, Injectable } from '@nestjs/common';
import { MatchWorkflowTemplateCommand } from '../../../lib/commands/workflow.commands';
import { buildCapabilityResult } from '../../../lib/domain';
import {
  TemplateMatchStatus,
  WorkflowEventType,
  WorkflowStatus,
} from '../../../lib/enums';
import { AuditService } from '../../audit/services/audit.service';
import { IdempotencyService } from '../../idempotency/services/idempotency.service';
import { MatchTemplateUseCase } from '../../template-matching/use-cases/match-template.use-case';
import {
  POSTSALE_WORKFLOW_REPOSITORY,
  PostsaleWorkflowRepository,
} from '../repository/postsale-workflow.repository';
import { MatchWorkflowTemplateOutcome } from './match-workflow-template.outcome';

const MATCH_WORKFLOW_TEMPLATE_SCOPE = 'match_workflow_template';

@Injectable()
export class MatchWorkflowTemplateUseCase {
  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly auditService: AuditService,
    @Inject(POSTSALE_WORKFLOW_REPOSITORY)
    private readonly workflowRepository: PostsaleWorkflowRepository,
    private readonly matchTemplateUseCase: MatchTemplateUseCase,
  ) {}

  async execute(
    command: MatchWorkflowTemplateCommand,
  ): Promise<MatchWorkflowTemplateOutcome> {
    const existing = await this.workflowRepository.findById(command.workflowId);
    if (!existing) {
      throw new Error(`Workflow not found: ${command.workflowId}`);
    }

    if (existing.status === WorkflowStatus.TEMPLATE_MATCHED) {
      return {
        type: 'already_matched',
        capability: buildCapabilityResult(existing),
        workflow: existing,
        carTemplateId: existing.carTemplateId,
      };
    }

    if (!existing.dealContext) {
      throw new Error(
        `Deal context not persisted for workflow: ${command.workflowId}`,
      );
    }

    const idempotencyKey = `${command.workflowId}:match_workflow_template`;
    const idempotencyResult = await this.idempotencyService.checkAndRecord(
      {
        idempotencyKey,
        scope: MATCH_WORKFLOW_TEMPLATE_SCOPE,
        requestId: command.requestId,
      },
      command.workflowId,
    );

    if (idempotencyResult.isDuplicate) {
      const workflow = await this.workflowRepository.findById(
        command.workflowId,
      );
      if (!workflow) {
        throw new Error(`Workflow not found: ${command.workflowId}`);
      }

      if (workflow.status === WorkflowStatus.TEMPLATE_MATCHED) {
        return {
          type: 'already_matched',
          capability: buildCapabilityResult(workflow),
          workflow,
          carTemplateId: workflow.carTemplateId,
        };
      }

      throw new Error(
        `Match workflow template idempotency duplicate before TEMPLATE_MATCHED: ${command.workflowId}`,
      );
    }

    const matchResult = await this.matchTemplateUseCase.execute({
      brand: existing.dealContext.brand,
      model: existing.dealContext.model,
      bodyType: existing.dealContext.bodyType,
      generation: existing.dealContext.generation,
    });

    if (matchResult.status === TemplateMatchStatus.MATCHED) {
      if (!matchResult.carTemplateId) {
        throw new Error(
          `Matched template missing carTemplateId for workflow: ${command.workflowId}`,
        );
      }

      await this.workflowRepository.updateCarTemplateMatch(command.workflowId, {
        carTemplateId: matchResult.carTemplateId,
        templateMatchStatus: TemplateMatchStatus.MATCHED,
        status: WorkflowStatus.TEMPLATE_MATCHED,
      });

      await this.auditService.emit({
        workflowId: command.workflowId,
        eventType: WorkflowEventType.TEMPLATE_MATCH_SUCCEEDED,
        statusBefore: WorkflowStatus.CONTEXT_LOADED,
        statusAfter: WorkflowStatus.TEMPLATE_MATCHED,
        payload: {
          carTemplateId: matchResult.carTemplateId,
        },
        requestId: command.requestId,
      });

      const updated = await this.workflowRepository.findById(
        command.workflowId,
      );
      if (!updated) {
        throw new Error(
          `Workflow not found after template match: ${command.workflowId}`,
        );
      }

      return {
        type: 'success',
        capability: buildCapabilityResult(updated),
        workflow: updated,
        carTemplateId: matchResult.carTemplateId,
      };
    }

    return {
      type: 'no_match',
      matchResult,
    };
  }
}
