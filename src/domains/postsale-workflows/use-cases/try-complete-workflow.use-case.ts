import { Inject, Injectable } from '@nestjs/common';
import { TryCompleteWorkflowCommand } from '../../../lib/commands/workflow.commands';
import { buildCapabilityResult, CapabilityResult } from '../../../lib/domain';
import { WorkflowStatus } from '../../../lib/enums';
import {
  POSTSALE_WORKFLOW_REPOSITORY,
  PostsaleWorkflowRepository,
} from '../repository/postsale-workflow.repository';
import { ApplyCompletionPolicyUseCase } from './apply-completion-policy.use-case';
import { ExecutePendingSideEffectsUseCase } from './execute-pending-side-effects.use-case';

export type TryCompleteWorkflowOutcome =
  | {
      type: 'completed';
      capability: CapabilityResult;
      workflow: NonNullable<
        Awaited<ReturnType<PostsaleWorkflowRepository['findById']>>
      >;
    }
  | {
      type: 'blocked';
      capability: CapabilityResult;
      workflow: NonNullable<
        Awaited<ReturnType<PostsaleWorkflowRepository['findById']>>
      >;
      reason: string;
    }
  | {
      type: 'incomplete';
      capability: CapabilityResult;
      workflow: NonNullable<
        Awaited<ReturnType<PostsaleWorkflowRepository['findById']>>
      >;
      reason: string;
    }
  | {
      type: 'rejected';
      reason: string;
    };

@Injectable()
export class TryCompleteWorkflowUseCase {
  constructor(
    private readonly applyCompletionPolicyUseCase: ApplyCompletionPolicyUseCase,
    private readonly executePendingSideEffectsUseCase: ExecutePendingSideEffectsUseCase,
    @Inject(POSTSALE_WORKFLOW_REPOSITORY)
    private readonly workflowRepository: PostsaleWorkflowRepository,
  ) {}

  async execute(
    command: TryCompleteWorkflowCommand,
  ): Promise<TryCompleteWorkflowOutcome> {
    const workflow = await this.workflowRepository.findById(command.workflowId);
    if (!workflow) {
      return {
        type: 'rejected',
        reason: 'workflow_not_found',
      };
    }

    if (workflow.status !== WorkflowStatus.REQUIREMENTS_UPDATED) {
      return {
        type: 'rejected',
        reason: `invalid_status_${workflow.status}`,
      };
    }

    const completion = await this.applyCompletionPolicyUseCase.execute({
      workflowId: command.workflowId,
      langflowAnalysisValid: command.langflowAnalysisValid ?? true,
      requestId: command.requestId,
    });

    if (completion.type === 'incomplete') {
      return {
        type: 'incomplete',
        capability: completion.capability,
        workflow: completion.workflow,
        reason: completion.reason,
      };
    }

    if (completion.type === 'rejected') {
      return {
        type: 'rejected',
        reason: completion.reason,
      };
    }

    const executed = await this.executePendingSideEffectsUseCase.execute({
      workflowId: command.workflowId,
      requestId: command.requestId,
    });

    if (executed.type === 'completed') {
      return {
        type: 'completed',
        capability: executed.capability,
        workflow: executed.workflow,
      };
    }

    if (executed.type === 'blocked') {
      return {
        type: 'blocked',
        capability: buildCapabilityResult(executed.workflow),
        workflow: executed.workflow,
        reason: executed.reason,
      };
    }

    if (executed.type === 'rejected') {
      return {
        type: 'rejected',
        reason: executed.reason,
      };
    }

    return {
      type: 'rejected',
      reason: 'side_effects_unexpected',
    };
  }
}
