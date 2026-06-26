import { Inject, Injectable } from '@nestjs/common';
import { SendCompletionConfirmationEmailCommand } from '../../../lib/commands/workflow.commands';
import { buildCapabilityResult } from '../../../lib/domain';
import {
  SideEffectRecordStatus,
  SideEffectType,
  WorkflowEventType,
  WorkflowStatus,
} from '../../../lib/enums';
import {
  EMAIL_PROVIDER,
  EmailProvider,
} from '../../../integrations/email/email.provider';
import { EmitWorkflowEventUseCase } from '../../audit/use-cases/emit-workflow-event.use-case';
import { SideEffectGuard } from '../../side-effects/guards/side-effect.guard';
import { SideEffectService } from '../../side-effects/services/side-effect.service';
import { GetWorkflowContextUseCase } from '../../postsale-workflows/use-cases/get-workflow-context.use-case';
import {
  OUTGOING_MESSAGE_REPOSITORY,
  OutgoingMessageRepository,
} from '../repository/message.repository';
import { buildCompletionConfirmationEmail } from '../services/completion-confirmation-email.builder';
import { SendCompletionConfirmationEmailOutcome } from './send-completion-confirmation-email.outcome';

@Injectable()
export class SendCompletionConfirmationEmailUseCase {
  constructor(
    private readonly getWorkflowContextUseCase: GetWorkflowContextUseCase,
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: EmailProvider,
    @Inject(OUTGOING_MESSAGE_REPOSITORY)
    private readonly outgoingMessageRepository: OutgoingMessageRepository,
    private readonly sideEffectService: SideEffectService,
    private readonly sideEffectGuard: SideEffectGuard,
    private readonly emitWorkflowEventUseCase: EmitWorkflowEventUseCase,
  ) {}

  async execute(
    command: SendCompletionConfirmationEmailCommand,
  ): Promise<SendCompletionConfirmationEmailOutcome> {
    const { workflow } = await this.getWorkflowContextUseCase.execute({
      workflowId: command.workflowId,
    });

    if (workflow.status !== WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE) {
      return {
        type: 'rejected',
        reason: `invalid_status_${workflow.status}`,
      };
    }

    const customerEmail = workflow.dealContext?.customerEmail;
    if (!customerEmail) {
      return {
        type: 'rejected',
        reason: 'customer_email_missing',
      };
    }

    const idempotencyKey = `${command.workflowId}:send_completion_confirmation`;
    const existing =
      await this.sideEffectService.findByIdempotencyKey(idempotencyKey);
    if (existing?.status === SideEffectRecordStatus.SUCCEEDED) {
      return {
        type: 'already_sent',
        capability: buildCapabilityResult(workflow),
        workflow,
      };
    }

    const draft = buildCompletionConfirmationEmail();
    const sideEffectRecord = await this.sideEffectService.recordForExecution({
      workflowId: command.workflowId,
      sideEffectType: SideEffectType.SEND_COMPLETION_CONFIRMATION_EMAIL,
      idempotencyKey,
      requestId: command.requestId,
    });

    if (sideEffectRecord.status === SideEffectRecordStatus.SUCCEEDED) {
      return {
        type: 'already_sent',
        capability: buildCapabilityResult(workflow),
        workflow,
      };
    }

    this.sideEffectGuard.assertCanExecute(sideEffectRecord);

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
    } catch (error) {
      await this.sideEffectService.markFailed(
        sideEffectRecord.id,
        error instanceof Error ? error.message : 'EMAIL_SEND_FAILED',
        true,
      );
      return {
        type: 'rejected',
        reason: 'email_send_failed',
      };
    }

    const outgoing = await this.outgoingMessageRepository.create({
      workflow_id: command.workflowId,
      customer_message_id: null,
      to_address: customerEmail,
      subject: draft.subject,
      body: draft.bodyText,
      provider_message_id: providerMessageId,
    });

    await this.emitWorkflowEventUseCase.execute({
      workflowId: command.workflowId,
      eventType: WorkflowEventType.COMPLETION_CONFIRMATION_EMAIL_SENT,
      statusBefore: WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE,
      statusAfter: WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE,
      payload: {
        outgoingMessageId: outgoing.id,
        providerMessageId,
      },
      requestId: command.requestId,
    });

    return {
      type: 'sent',
      capability: buildCapabilityResult(workflow),
      workflow,
      outgoingMessageId: outgoing.id,
      providerMessageId,
    };
  }
}
