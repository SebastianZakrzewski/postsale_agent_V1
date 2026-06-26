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

    if (
      statusBefore !== WorkflowStatus.REQUIREMENTS_UPDATED &&
      statusBefore !== WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY
    ) {
      throw new Error(
        `Cannot escalate to pending Bitrix from status ${statusBefore}`,
      );
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
