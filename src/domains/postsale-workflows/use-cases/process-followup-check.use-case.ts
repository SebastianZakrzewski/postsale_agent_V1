import { Injectable } from '@nestjs/common';
import { FollowupCheckCommand } from '../../../lib/commands/workflow.commands';
import { WorkflowStatus } from '../../../lib/enums';
import { evaluateCompletionPolicy } from '../policies/completion.policy';
import { evaluateFollowupPolicy } from '../policies/followup.policy';
import { PolicyContextBuilderService } from '../services/policy-context-builder.service';
import { ApplyCompletionPolicyUseCase } from './apply-completion-policy.use-case';
import { EscalateToPendingBitrixUseCase } from './escalate-to-pending-bitrix.use-case';
import { ExecutePendingSideEffectsUseCase } from './execute-pending-side-effects.use-case';
import { GetWorkflowContextUseCase } from './get-workflow-context.use-case';
import { SendFollowupUseCase } from './send-followup.use-case';

export type FollowupCheckOutcome =
  | {
      type: 'completed';
      workflowId: string;
      status: WorkflowStatus;
    }
  | {
      type: 'followup_sent';
      workflowId: string;
      status: WorkflowStatus;
    }
  | {
      type: 'escalated';
      workflowId: string;
      status: WorkflowStatus;
      reason: string;
    }
  | {
      type: 'waiting';
      workflowId: string;
      status: WorkflowStatus;
      reason: string;
    }
  | {
      type: 'rejected';
      reason: string;
    };

@Injectable()
export class ProcessFollowupCheckUseCase {
  constructor(
    private readonly getWorkflowContextUseCase: GetWorkflowContextUseCase,
    private readonly policyContextBuilder: PolicyContextBuilderService,
    private readonly applyCompletionPolicyUseCase: ApplyCompletionPolicyUseCase,
    private readonly sendFollowupUseCase: SendFollowupUseCase,
    private readonly escalateToPendingBitrixUseCase: EscalateToPendingBitrixUseCase,
    private readonly executePendingSideEffectsUseCase: ExecutePendingSideEffectsUseCase,
  ) {}

  async execute(command: FollowupCheckCommand): Promise<FollowupCheckOutcome> {
    const { workflow } = await this.getWorkflowContextUseCase.execute({
      workflowId: command.workflowId,
    });

    if (
      workflow.status !== WorkflowStatus.REQUIREMENTS_UPDATED &&
      workflow.status !== WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY
    ) {
      return {
        type: 'rejected',
        reason: `invalid_status_${workflow.status}`,
      };
    }

    if (workflow.status === WorkflowStatus.REQUIREMENTS_UPDATED) {
      const completion = await this.applyCompletionPolicyUseCase.execute({
        workflowId: command.workflowId,
        requestId: command.requestId,
      });

      if (completion.type === 'passed') {
        const executed = await this.executePendingSideEffectsUseCase.execute({
          workflowId: command.workflowId,
          requestId: command.requestId,
        });
        if (executed.type === 'completed' || executed.type === 'escalated') {
          return {
            type: 'completed',
            workflowId: command.workflowId,
            status: executed.workflow.status,
          };
        }
        return {
          type: 'waiting',
          workflowId: command.workflowId,
          status:
            executed.type === 'blocked'
              ? executed.workflow.status
              : workflow.status,
          reason:
            executed.type === 'blocked'
              ? executed.reason
              : 'side_effects_rejected',
        };
      }
    }

    const policyInput =
      await this.policyContextBuilder.buildCompletionPolicyInput(
        workflow,
        true,
      );
    const completionResult = evaluateCompletionPolicy(policyInput);
    const now = command.now ? new Date(command.now) : new Date();
    const followupResult = evaluateFollowupPolicy({
      workflow,
      completionOutcome: completionResult.outcome,
      now,
      waitingSince: workflow.updatedAt,
      trigger: 'SILENCE',
    });

    if (followupResult.outcome === 'ESCALATE') {
      const escalated = await this.escalateToPendingBitrixUseCase.execute({
        workflowId: command.workflowId,
        reason: followupResult.reason ?? 'max_follow_ups_reached',
        requestId: command.requestId,
      });
      const executed = await this.executePendingSideEffectsUseCase.execute({
        workflowId: command.workflowId,
        requestId: command.requestId,
      });
      const status =
        executed.type === 'completed' || executed.type === 'escalated'
          ? executed.workflow.status
          : WorkflowStatus.ESCALATION_PENDING_BITRIX_UPDATE;
      return {
        type: 'escalated',
        workflowId: command.workflowId,
        status,
        reason: escalated.reason,
      };
    }

    if (followupResult.outcome === 'ALLOW') {
      const sent = await this.sendFollowupUseCase.execute({
        workflowId: command.workflowId,
        requestId: command.requestId,
        trigger: 'SILENCE',
      });

      if (sent.type === 'sent') {
        return {
          type: 'followup_sent',
          workflowId: command.workflowId,
          status: sent.workflow.status,
        };
      }

      if (sent.type === 'escalated') {
        const executed = await this.executePendingSideEffectsUseCase.execute({
          workflowId: command.workflowId,
          requestId: command.requestId,
        });
        const status =
          executed.type === 'completed' || executed.type === 'escalated'
            ? executed.workflow.status
            : WorkflowStatus.ESCALATION_PENDING_BITRIX_UPDATE;
        return {
          type: 'escalated',
          workflowId: command.workflowId,
          status,
          reason: sent.reason,
        };
      }
    }

    return {
      type: 'waiting',
      workflowId: command.workflowId,
      status: workflow.status,
      reason: followupResult.reason ?? 'no_action',
    };
  }
}
