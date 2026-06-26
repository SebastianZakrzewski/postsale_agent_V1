import { Inject, Injectable } from '@nestjs/common';
import { ApplyCompletionPolicyCommand } from '../../../lib/commands/workflow.commands';
import { buildCapabilityResult, CapabilityResult } from '../../../lib/domain';
import { WorkflowEventType, WorkflowStatus } from '../../../lib/enums';
import { EmitWorkflowEventUseCase } from '../../audit/use-cases/emit-workflow-event.use-case';
import { evaluateCompletionPolicy } from '../policies/completion.policy';
import {
  POSTSALE_WORKFLOW_REPOSITORY,
  PostsaleWorkflowRepository,
} from '../repository/postsale-workflow.repository';
import { PolicyContextBuilderService } from '../services/policy-context-builder.service';
import { GetWorkflowContextUseCase } from './get-workflow-context.use-case';

export type ApplyCompletionPolicyOutcome =
  | {
      type: 'passed';
      capability: CapabilityResult;
      workflow: NonNullable<
        Awaited<ReturnType<PostsaleWorkflowRepository['findById']>>
      >;
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
export class ApplyCompletionPolicyUseCase {
  constructor(
    private readonly getWorkflowContextUseCase: GetWorkflowContextUseCase,
    private readonly policyContextBuilder: PolicyContextBuilderService,
    @Inject(POSTSALE_WORKFLOW_REPOSITORY)
    private readonly workflowRepository: PostsaleWorkflowRepository,
    private readonly emitWorkflowEventUseCase: EmitWorkflowEventUseCase,
  ) {}

  async execute(
    command: ApplyCompletionPolicyCommand,
  ): Promise<ApplyCompletionPolicyOutcome> {
    const { workflow } = await this.getWorkflowContextUseCase.execute({
      workflowId: command.workflowId,
    });

    if (workflow.status !== WorkflowStatus.REQUIREMENTS_UPDATED) {
      return {
        type: 'rejected',
        reason: `invalid_status_${workflow.status}`,
      };
    }

    const policyInput =
      await this.policyContextBuilder.buildCompletionPolicyInput(
        workflow,
        command.langflowAnalysisValid ?? true,
      );
    const policyResult = evaluateCompletionPolicy(policyInput);

    if (policyResult.outcome === 'INCOMPLETE') {
      return {
        type: 'incomplete',
        capability: buildCapabilityResult(workflow),
        workflow,
        reason: policyResult.reason ?? 'requirements_incomplete',
      };
    }

    if (policyResult.outcome === 'ESCALATE') {
      return {
        type: 'rejected',
        reason: policyResult.reason ?? 'completion_escalate',
      };
    }

    await this.workflowRepository.updateStatus(
      command.workflowId,
      WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE,
    );

    await this.emitWorkflowEventUseCase.execute({
      workflowId: command.workflowId,
      eventType: WorkflowEventType.COMPLETION_POLICY_PASSED,
      statusBefore: WorkflowStatus.REQUIREMENTS_UPDATED,
      statusAfter: WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE,
      payload: {},
      requestId: command.requestId,
    });

    const updated = await this.workflowRepository.findById(command.workflowId);
    if (!updated) {
      throw new Error(
        `Workflow not found after completion policy: ${command.workflowId}`,
      );
    }

    return {
      type: 'passed',
      capability: buildCapabilityResult(updated),
      workflow: updated,
    };
  }
}
