import { Inject, Injectable } from '@nestjs/common';
import { MatchWorkflowTemplateCommand } from '../../../lib/commands/workflow.commands';
import { buildCapabilityResult } from '../../../lib/domain';
import {
  TemplateMatchStatus,
  WorkflowEventType,
  WorkflowStatus,
} from '../../../lib/enums';
import { EmitWorkflowEventUseCase } from '../../audit/use-cases/emit-workflow-event.use-case';
import { CheckIdempotencyUseCase } from '../../idempotency/use-cases/check-idempotency.use-case';
import { TemplateMatchingService } from '../../template-matching/services/template-matching.service';
import { TemplateNoteSelectionService } from '../../template-matching/services/template-note-selection.service';
import {
  POSTSALE_WORKFLOW_REPOSITORY,
  PostsaleWorkflowRepository,
} from '../repository/postsale-workflow.repository';
import { MatchWorkflowTemplateOutcome } from './match-workflow-template.outcome';

const MATCH_WORKFLOW_TEMPLATE_SCOPE = 'match_workflow_template';

@Injectable()
export class MatchWorkflowTemplateUseCase {
  constructor(
    private readonly checkIdempotencyUseCase: CheckIdempotencyUseCase,
    @Inject(POSTSALE_WORKFLOW_REPOSITORY)
    private readonly workflowRepository: PostsaleWorkflowRepository,
    private readonly templateMatchingService: TemplateMatchingService,
    private readonly templateNoteSelectionService: TemplateNoteSelectionService,
    private readonly emitWorkflowEventUseCase: EmitWorkflowEventUseCase,
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
      };
    }

    if (!existing.dealContext) {
      throw new Error(
        `Deal context not persisted for workflow: ${command.workflowId}`,
      );
    }

    const idempotencyKey = `${command.workflowId}:match_workflow_template`;
    const idempotencyResult = await this.checkIdempotencyUseCase.execute(
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
        };
      }

      throw new Error(
        `Match workflow template idempotency duplicate before TEMPLATE_MATCHED: ${command.workflowId}`,
      );
    }

    const stage1 = await this.templateMatchingService.matchDealContext(
      existing.dealContext,
    );

    if (stage1.status === 'NOT_FOUND') {
      return {
        type: 'no_match',
        capability: buildCapabilityResult(existing),
        workflow: existing,
        matchResult: {
          status: TemplateMatchStatus.NOT_FOUND,
          escalationReason: stage1.escalationReason,
        },
      };
    }

    if (stage1.status === 'AMBIGUOUS') {
      return {
        type: 'no_match',
        capability: buildCapabilityResult(existing),
        workflow: existing,
        matchResult: {
          status: TemplateMatchStatus.AMBIGUOUS,
          escalationReason: stage1.escalationReason,
        },
      };
    }

    const noteResult = this.templateNoteSelectionService.selectNotes({
      carTemplate: stage1.carTemplate,
      product: existing.dealContext.product,
      productEnumId: existing.dealContext.productEnumId,
      setVariantId: existing.dealContext.setVariantId,
      resolvedBodyProfile: stage1.resolvedBodyProfile,
    });

    if (noteResult.requiresEscalation) {
      return {
        type: 'no_match',
        capability: buildCapabilityResult(existing),
        workflow: existing,
        matchResult: {
          status: TemplateMatchStatus.NOT_FOUND,
          escalationReason: noteResult.escalationReason,
        },
      };
    }

    await this.workflowRepository.updateTemplateMatch(command.workflowId, {
      templateMatchStatus: TemplateMatchStatus.MATCHED,
      status: WorkflowStatus.TEMPLATE_MATCHED,
      carTemplateId: stage1.carTemplate.id,
    });

    await this.emitWorkflowEventUseCase.execute({
      workflowId: command.workflowId,
      eventType: WorkflowEventType.TEMPLATE_MATCH_SUCCEEDED,
      statusBefore: existing.status,
      statusAfter: WorkflowStatus.TEMPLATE_MATCHED,
      payload: {
        carTemplateId: stage1.carTemplate.id,
        selectedNotes: noteResult.notes,
      },
      requestId: command.requestId,
    });

    const updated = await this.workflowRepository.findById(command.workflowId);
    if (!updated) {
      throw new Error(
        `Workflow not found after template match: ${command.workflowId}`,
      );
    }

    const matchResult = {
      status: TemplateMatchStatus.MATCHED,
      carTemplateId: stage1.carTemplate.id,
      selectedNotes: noteResult.notes,
    };

    return {
      type: 'matched',
      capability: buildCapabilityResult(updated),
      workflow: updated,
      matchResult,
    };
  }
}
