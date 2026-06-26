import { Inject, Injectable } from '@nestjs/common';
import { EscalateToPendingBitrixCommand } from '../../../lib/commands/workflow.commands';
import { buildCapabilityResult, CapabilityResult } from '../../../lib/domain';
import { WorkflowStatus } from '../../../lib/enums';
import {
  POSTSALE_WORKFLOW_REPOSITORY,
  PostsaleWorkflowRepository,
} from '../repository/postsale-workflow.repository';
import { evaluateEscalationPolicy } from '../policies/escalation.policy';
import { GetWorkflowContextUseCase } from './get-workflow-context.use-case';

const TERMINAL_ESCALATION_STATUSES = new Set<WorkflowStatus>([
  WorkflowStatus.COMPLETED,
  WorkflowStatus.ESCALATED,
  WorkflowStatus.FAILED,
]);

export type EscalateToPendingBitrixOutcome = {
  type: 'pending';
  capability: CapabilityResult;
  workflow: NonNullable<
    Awaited<ReturnType<PostsaleWorkflowRepository['findById']>>
  >;
  reason: string;
};

@Injectable()
export class EscalateToPendingBitrixUseCase {
  constructor(
    private readonly getWorkflowContextUseCase: GetWorkflowContextUseCase,
    @Inject(POSTSALE_WORKFLOW_REPOSITORY)
    private readonly workflowRepository: PostsaleWorkflowRepository,
  ) {}

  async execute(
    command: EscalateToPendingBitrixCommand,
  ): Promise<EscalateToPendingBitrixOutcome> {
    const { workflow } = await this.getWorkflowContextUseCase.execute({
      workflowId: command.workflowId,
    });

    evaluateEscalationPolicy({
      reason:
        command.reason === 'max_follow_ups_reached'
          ? 'max_follow_ups_reached'
          : 'policy_escalation',
    });

    const statusBefore = workflow.status;

    if (TERMINAL_ESCALATION_STATUSES.has(statusBefore)) {
      throw new Error(
        `Cannot escalate to pending Bitrix from terminal status ${statusBefore}`,
      );
    }

    if (statusBefore === WorkflowStatus.ESCALATION_PENDING_BITRIX_UPDATE) {
      return {
        type: 'pending',
        capability: buildCapabilityResult(workflow),
        workflow,
        reason: command.reason,
      };
    }

    await this.workflowRepository.updateStatus(
      command.workflowId,
      WorkflowStatus.ESCALATION_PENDING_BITRIX_UPDATE,
    );

    const updated = await this.workflowRepository.findById(command.workflowId);
    if (!updated) {
      throw new Error(
        `Workflow not found after escalation pending: ${command.workflowId}`,
      );
    }

    return {
      type: 'pending',
      capability: buildCapabilityResult(updated),
      workflow: updated,
      reason: command.reason,
    };
  }
}
