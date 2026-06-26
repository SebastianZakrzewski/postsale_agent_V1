import { Inject, Injectable } from '@nestjs/common';
import { SendFollowupCommand } from '../../../lib/commands/workflow.commands';
import { buildCapabilityResult } from '../../../lib/domain';
import {
  RequirementStatus,
  SideEffectType,
  WorkflowEventType,
  WorkflowStatus,
} from '../../../lib/enums';
import {
  EMAIL_PROVIDER,
  EmailProvider,
} from '../../../integrations/email/email.provider';
import {
  LANGFLOW_PROVIDER,
  LangflowProvider,
} from '../../../integrations/langflow/langflow.provider';
import { EmitWorkflowEventUseCase } from '../../audit/use-cases/emit-workflow-event.use-case';
import {
  OUTGOING_MESSAGE_REPOSITORY,
  OutgoingMessageRepository,
} from '../../email/repository/message.repository';
import { SideEffectGuard } from '../../side-effects/guards/side-effect.guard';
import { SideEffectService } from '../../side-effects/services/side-effect.service';
import {
  LANGFLOW_CONFIDENCE_THRESHOLD,
  LANGFLOW_FLOW_DRAFT_FOLLOWUP_EMAIL,
} from '../../langflow/config/langflow-flow-names';
import {
  EmailDraftParseError,
  parseEmailDraftOutput,
} from '../../langflow/parsers/email-draft.parser';
import { LangflowRunRecorderService } from '../../langflow/services/langflow-run-recorder.service';
import { LangflowValidationErrorCode } from '../../langflow/parsers/langflow-validation-error-codes';
import {
  WORKFLOW_REQUIREMENT_REPOSITORY,
  WorkflowRequirementRepository,
} from '../../requirements/repository/workflow-requirement.repository';
import { mapRequirementForLangflow } from '../../requirements/services/requirement-langflow.mapper';
import { evaluateFollowupPolicy } from '../policies/followup.policy';
import { evaluateCompletionPolicy } from '../policies/completion.policy';
import {
  POSTSALE_WORKFLOW_REPOSITORY,
  PostsaleWorkflowRepository,
} from '../repository/postsale-workflow.repository';
import { PolicyContextBuilderService } from '../services/policy-context-builder.service';
import { EscalateToPendingBitrixUseCase } from './escalate-to-pending-bitrix.use-case';
import { GetWorkflowContextUseCase } from './get-workflow-context.use-case';
import { SendFollowupOutcome } from './send-followup.outcome';

const INCOMPLETE_STATUSES: RequirementStatus[] = [
  RequirementStatus.PENDING,
  RequirementStatus.PARTIAL,
  RequirementStatus.UNCLEAR,
];

@Injectable()
export class SendFollowupUseCase {
  constructor(
    private readonly getWorkflowContextUseCase: GetWorkflowContextUseCase,
    private readonly policyContextBuilder: PolicyContextBuilderService,
    @Inject(WORKFLOW_REQUIREMENT_REPOSITORY)
    private readonly requirementRepository: WorkflowRequirementRepository,
    @Inject(LANGFLOW_PROVIDER)
    private readonly langflowProvider: LangflowProvider,
    private readonly langflowRunRecorder: LangflowRunRecorderService,
    private readonly sideEffectService: SideEffectService,
    private readonly sideEffectGuard: SideEffectGuard,
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: EmailProvider,
    @Inject(OUTGOING_MESSAGE_REPOSITORY)
    private readonly outgoingMessageRepository: OutgoingMessageRepository,
    @Inject(POSTSALE_WORKFLOW_REPOSITORY)
    private readonly workflowRepository: PostsaleWorkflowRepository,
    private readonly emitWorkflowEventUseCase: EmitWorkflowEventUseCase,
    private readonly escalateToPendingBitrixUseCase: EscalateToPendingBitrixUseCase,
  ) {}

  async execute(command: SendFollowupCommand): Promise<SendFollowupOutcome> {
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

    const policyInput =
      await this.policyContextBuilder.buildCompletionPolicyInput(
        workflow,
        true,
      );
    const completionResult = evaluateCompletionPolicy(policyInput);
    const followupResult = evaluateFollowupPolicy({
      workflow,
      completionOutcome: completionResult.outcome,
      now: new Date(),
      waitingSince: workflow.updatedAt,
    });

    if (followupResult.outcome === 'DENY') {
      return {
        type: 'rejected',
        reason: followupResult.reason ?? 'follow_up_not_allowed',
      };
    }

    if (followupResult.outcome === 'WAIT') {
      return {
        type: 'not_due',
        capability: buildCapabilityResult(workflow),
        workflow,
      };
    }

    if (followupResult.outcome === 'ESCALATE') {
      const escalated = await this.escalateToPendingBitrixUseCase.execute({
        workflowId: command.workflowId,
        reason: followupResult.reason ?? 'max_follow_ups_reached',
        requestId: command.requestId,
      });
      return {
        type: 'escalated',
        capability: escalated.capability,
        workflow: escalated.workflow,
        reason: escalated.reason,
      };
    }

    const requirements = await this.requirementRepository.findByWorkflowId(
      command.workflowId,
    );
    const pendingRequirements = requirements.filter((row) =>
      INCOMPLETE_STATUSES.includes(row.status),
    );

    if (pendingRequirements.length === 0) {
      return {
        type: 'rejected',
        reason: 'no_missing_requirements',
      };
    }

    const customerEmail = workflow.dealContext?.customerEmail;
    if (!customerEmail) {
      return {
        type: 'rejected',
        reason: 'customer_email_missing',
      };
    }

    const langflowOutput = await this.langflowProvider.invoke(
      LANGFLOW_FLOW_DRAFT_FOLLOWUP_EMAIL,
      {
        workflowId: command.workflowId,
        requirements: pendingRequirements.map((row) =>
          mapRequirementForLangflow(row),
        ),
        dealContext: workflow.dealContext,
        followUpCount: workflow.followUpCount,
      },
    );

    let draft;
    try {
      draft = parseEmailDraftOutput(langflowOutput);
    } catch (error) {
      const reason =
        error instanceof EmailDraftParseError
          ? error.code
          : 'email_draft_parse_failed';
      await this.recordLangflowRun(command, false, reason);
      const escalated = await this.escalateToPendingBitrixUseCase.execute({
        workflowId: command.workflowId,
        reason,
        requestId: command.requestId,
      });
      return {
        type: 'escalated',
        capability: escalated.capability,
        workflow: escalated.workflow,
        reason,
      };
    }

    if (draft.confidence < LANGFLOW_CONFIDENCE_THRESHOLD) {
      await this.recordLangflowRun(
        command,
        false,
        'low_confidence_email_draft',
      );
      const escalated = await this.escalateToPendingBitrixUseCase.execute({
        workflowId: command.workflowId,
        reason: 'low_confidence_email_draft',
        requestId: command.requestId,
      });
      return {
        type: 'escalated',
        capability: escalated.capability,
        workflow: escalated.workflow,
        reason: 'low_confidence_email_draft',
      };
    }

    await this.recordLangflowRun(command, true, null);

    const followUpNumber = workflow.followUpCount + 1;
    const idempotencyKey = `${command.workflowId}:send_followup:${followUpNumber}`;
    const sideEffectRecord = await this.sideEffectService.record({
      workflowId: command.workflowId,
      sideEffectType: SideEffectType.SEND_FOLLOWUP_EMAIL,
      idempotencyKey,
      requestId: command.requestId,
    });

    this.sideEffectGuard.assertCanExecute(sideEffectRecord);

    const statusBefore = workflow.status;
    let providerMessageId: string;
    try {
      const sendResult = await this.emailProvider.send({
        to: customerEmail,
        subject: draft.subject,
        body: draft.bodyText,
        bodyHtml: draft.bodyHtml,
      });
      providerMessageId = sendResult.providerMessageId;
      await this.sideEffectService.markSucceeded(sideEffectRecord.id, {
        providerMessageId,
      });
    } catch {
      await this.sideEffectService.markFailed(
        sideEffectRecord.id,
        'EMAIL_SEND_FAILED',
        true,
      );
      throw new Error(
        `Follow-up send failed for workflow: ${command.workflowId}`,
      );
    }

    const outgoing = await this.outgoingMessageRepository.create({
      workflow_id: command.workflowId,
      customer_message_id: null,
      to_address: customerEmail,
      subject: draft.subject,
      body: draft.bodyText,
      provider_message_id: providerMessageId,
    });

    const followedUpAt = new Date();
    await this.workflowRepository.incrementFollowUp(
      command.workflowId,
      followedUpAt,
    );
    await this.workflowRepository.updateStatus(
      command.workflowId,
      WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY,
    );

    await this.emitWorkflowEventUseCase.execute({
      workflowId: command.workflowId,
      eventType: WorkflowEventType.INITIAL_EMAIL_SENT,
      statusBefore,
      statusAfter: WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY,
      payload: {
        outgoingMessageId: outgoing.id,
        providerMessageId,
        followUpNumber,
        isFollowUp: true,
      },
      requestId: command.requestId,
    });

    const updated = await this.workflowRepository.findById(command.workflowId);
    if (!updated) {
      throw new Error(
        `Workflow not found after follow-up send: ${command.workflowId}`,
      );
    }

    return {
      type: 'sent',
      capability: buildCapabilityResult(updated),
      workflow: updated,
      outgoingMessageId: outgoing.id,
      providerMessageId,
      followUpNumber,
    };
  }

  private async recordLangflowRun(
    command: SendFollowupCommand,
    parsedSuccess: boolean,
    validationErrors: LangflowValidationErrorCode | null,
  ): Promise<void> {
    await this.langflowRunRecorder.record({
      workflowId: command.workflowId,
      flowName: LANGFLOW_FLOW_DRAFT_FOLLOWUP_EMAIL,
      requestId: command.requestId,
      parsedSuccess,
      validationErrors,
    });
  }
}
