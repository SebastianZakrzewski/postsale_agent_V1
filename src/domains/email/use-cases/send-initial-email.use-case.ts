import { Inject, Injectable } from '@nestjs/common';
import { SendInitialEmailCommand } from '../../../lib/commands/workflow.commands';
import { buildCapabilityResult } from '../../../lib/domain';
import {
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
import { InitialEmailForbiddenError } from '../errors/email.errors';
import {
  OUTGOING_MESSAGE_REPOSITORY,
  OutgoingMessageRepository,
} from '../repository/message.repository';
import { SideEffectGuard } from '../../side-effects/guards/side-effect.guard';
import { SideEffectService } from '../../side-effects/services/side-effect.service';
import {
  LANGFLOW_CONFIDENCE_THRESHOLD,
  LANGFLOW_FLOW_DRAFT_INITIAL_EMAIL,
} from '../../langflow/config/langflow-flow-names';
import {
  EmailDraftParseError,
  parseEmailDraftOutput,
} from '../../langflow/parsers/email-draft.parser';
import { LangflowRunRecorderService } from '../../langflow/services/langflow-run-recorder.service';
import { LangflowValidationErrorCode } from '../../langflow/parsers/langflow-validation-error-codes';
import { EscalateWorkflowUseCase } from '../../postsale-workflows/use-cases/escalate-workflow.use-case';
import { GetWorkflowContextUseCase } from '../../postsale-workflows/use-cases/get-workflow-context.use-case';
import {
  POSTSALE_WORKFLOW_REPOSITORY,
  PostsaleWorkflowRepository,
} from '../../postsale-workflows/repository/postsale-workflow.repository';
import {
  WORKFLOW_REQUIREMENT_REPOSITORY,
  WorkflowRequirementRepository,
} from '../../requirements/repository/workflow-requirement.repository';
import { SendInitialEmailOutcome } from './send-initial-email.outcome';

@Injectable()
export class SendInitialEmailUseCase {
  constructor(
    private readonly getWorkflowContextUseCase: GetWorkflowContextUseCase,
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
    private readonly escalateWorkflowUseCase: EscalateWorkflowUseCase,
  ) {}

  async execute(
    command: SendInitialEmailCommand,
  ): Promise<SendInitialEmailOutcome> {
    const { workflow } = await this.getWorkflowContextUseCase.execute({
      workflowId: command.workflowId,
    });

    if (workflow.status === WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY) {
      return {
        type: 'already_sent',
        capability: buildCapabilityResult(workflow),
        workflow,
      };
    }

    const requirements = await this.requirementRepository.findByWorkflowId(
      command.workflowId,
    );

    if (requirements.length === 0) {
      return {
        type: 'rejected',
        reason: 'requirements_missing',
      };
    }

    if (workflow.status !== WorkflowStatus.REQUIREMENTS_CREATED) {
      throw new InitialEmailForbiddenError(
        command.workflowId,
        `status_${workflow.status}`,
      );
    }

    const langflowOutput = await this.langflowProvider.invoke(
      LANGFLOW_FLOW_DRAFT_INITIAL_EMAIL,
      {
        workflowId: command.workflowId,
        requirements: requirements.map((row) => ({
          id: row.id,
          label: row.label,
          sourceNote: row.source_note,
          sourceField: row.source_field,
        })),
        dealContext: workflow.dealContext,
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
      return this.escalate(command, reason);
    }

    if (draft.confidence < LANGFLOW_CONFIDENCE_THRESHOLD) {
      await this.recordLangflowRun(
        command,
        false,
        'low_confidence_email_draft',
      );
      return this.escalate(command, 'low_confidence_email_draft');
    }

    await this.recordLangflowRun(command, true, null);

    const idempotencyKey = `${command.workflowId}:send_initial_email`;
    const sideEffectRecord = await this.sideEffectService.record({
      workflowId: command.workflowId,
      sideEffectType: SideEffectType.SEND_INITIAL_EMAIL,
      idempotencyKey,
      requestId: command.requestId,
    });

    this.sideEffectGuard.assertCanExecute(sideEffectRecord);

    let providerMessageId: string;
    try {
      const sendResult = await this.emailProvider.send({
        to: command.recipientEmail,
        subject: draft.subject,
        body: draft.bodyText,
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
      throw new Error(`Email send failed for workflow: ${command.workflowId}`);
    }

    const outgoing = await this.outgoingMessageRepository.create({
      workflow_id: command.workflowId,
      customer_message_id: null,
      to_address: command.recipientEmail,
      subject: draft.subject,
      body: draft.bodyText,
      provider_message_id: providerMessageId,
    });

    await this.workflowRepository.updateStatus(
      command.workflowId,
      WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY,
    );

    await this.emitWorkflowEventUseCase.execute({
      workflowId: command.workflowId,
      eventType: WorkflowEventType.INITIAL_EMAIL_SENT,
      statusBefore: WorkflowStatus.REQUIREMENTS_CREATED,
      statusAfter: WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY,
      payload: {
        outgoingMessageId: outgoing.id,
        providerMessageId,
      },
      requestId: command.requestId,
    });

    const updated = await this.workflowRepository.findById(command.workflowId);
    if (!updated) {
      throw new Error(
        `Workflow not found after email send: ${command.workflowId}`,
      );
    }

    return {
      type: 'sent',
      capability: buildCapabilityResult(updated),
      workflow: updated,
      outgoingMessageId: outgoing.id,
      providerMessageId,
    };
  }

  private async recordLangflowRun(
    command: SendInitialEmailCommand,
    parsedSuccess: boolean,
    validationErrors: LangflowValidationErrorCode | null,
  ): Promise<void> {
    await this.langflowRunRecorder.record({
      workflowId: command.workflowId,
      flowName: LANGFLOW_FLOW_DRAFT_INITIAL_EMAIL,
      requestId: command.requestId,
      parsedSuccess,
      validationErrors,
    });
  }

  private async escalate(
    command: SendInitialEmailCommand,
    reason: string,
  ): Promise<SendInitialEmailOutcome> {
    const escalated = await this.escalateWorkflowUseCase.execute({
      workflowId: command.workflowId,
      reason,
      requestId: command.requestId,
    });

    return {
      type: 'escalated',
      capability: buildCapabilityResult(escalated),
      workflow: escalated,
      reason,
    };
  }
}
