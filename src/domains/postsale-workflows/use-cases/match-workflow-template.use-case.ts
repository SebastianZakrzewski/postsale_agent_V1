import { Inject, Injectable } from '@nestjs/common';
import { MatchWorkflowTemplateCommand } from '../../../lib/commands/workflow.commands';
import { buildCapabilityResult } from '../../../lib/domain';
import { TemplateMatchStatus, WorkflowStatus } from '../../../lib/enums';
import { CheckIdempotencyUseCase } from '../../idempotency/use-cases/check-idempotency.use-case';
import {
  POSTSALE_WORKFLOW_REPOSITORY,
  PostsaleWorkflowRepository,
} from '../repository/postsale-workflow.repository';
import { MatchWorkflowTemplateOutcome } from './match-workflow-template.outcome';

const MATCH_WORKFLOW_TEMPLATE_SCOPE = 'match_workflow_template';
const TEMPLATE_MAPPING_NOT_IMPLEMENTED = 'template_mapping_not_implemented';

@Injectable()
export class MatchWorkflowTemplateUseCase {
  constructor(
    private readonly checkIdempotencyUseCase: CheckIdempotencyUseCase,
    @Inject(POSTSALE_WORKFLOW_REPOSITORY)
    private readonly workflowRepository: PostsaleWorkflowRepository,
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

    return {
      type: 'no_match',
      capability: buildCapabilityResult(existing),
      workflow: existing,
      matchResult: {
        status: TemplateMatchStatus.NOT_FOUND,
        escalationReason: TEMPLATE_MAPPING_NOT_IMPLEMENTED,
      },
    };
  }
}
