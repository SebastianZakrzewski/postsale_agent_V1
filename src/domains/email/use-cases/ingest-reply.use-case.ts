import { Inject, Injectable } from '@nestjs/common';
import { IngestReplyCommand } from '../../../lib/commands/workflow.commands';
import { buildCapabilityResult } from '../../../lib/domain';
import {
  MessageDirection,
  WorkflowEventType,
  WorkflowStatus,
} from '../../../lib/enums';
import { EmitWorkflowEventUseCase } from '../../audit/use-cases/emit-workflow-event.use-case';
import { CheckIdempotencyUseCase } from '../../idempotency/use-cases/check-idempotency.use-case';
import { EscalateToPendingBitrixUseCase } from '../../postsale-workflows/use-cases/escalate-to-pending-bitrix.use-case';
import { ExecutePendingSideEffectsUseCase } from '../../postsale-workflows/use-cases/execute-pending-side-effects.use-case';
import { GetWorkflowContextUseCase } from '../../postsale-workflows/use-cases/get-workflow-context.use-case';
import { DuplicateCustomerMessageError } from '../errors/customer-message.errors';
import {
  CUSTOMER_MESSAGE_REPOSITORY,
  MESSAGE_ATTACHMENT_REPOSITORY,
  MESSAGE_LINK_REPOSITORY,
  CustomerMessageRepository,
  MessageAttachmentRepository,
  MessageLinkRepository,
} from '../repository/message.repository';
import { extractUrlsFromEmailBody } from '../services/link-extractor.service';
import { ReplyWorkflowMatcherService } from '../services/reply-workflow-matcher.service';
import { EscalateUnmatchedReplyUseCase } from './escalate-unmatched-reply.use-case';
import { IngestReplyOutcome } from './ingest-reply.outcome';
import {
  WORKFLOW_REQUIREMENT_REPOSITORY,
  WorkflowRequirementRepository,
} from '../../requirements/repository/workflow-requirement.repository';
import { RequirementLabel } from '../../../lib/enums';

@Injectable()
export class IngestReplyUseCase {
  constructor(
    private readonly replyWorkflowMatcher: ReplyWorkflowMatcherService,
    private readonly getWorkflowContextUseCase: GetWorkflowContextUseCase,
    private readonly checkIdempotencyUseCase: CheckIdempotencyUseCase,
    private readonly escalateUnmatchedReplyUseCase: EscalateUnmatchedReplyUseCase,
    @Inject(CUSTOMER_MESSAGE_REPOSITORY)
    private readonly customerMessageRepository: CustomerMessageRepository,
    @Inject(MESSAGE_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepository: MessageAttachmentRepository,
    @Inject(MESSAGE_LINK_REPOSITORY)
    private readonly linkRepository: MessageLinkRepository,
    @Inject(WORKFLOW_REQUIREMENT_REPOSITORY)
    private readonly requirementRepository: WorkflowRequirementRepository,
    private readonly emitWorkflowEventUseCase: EmitWorkflowEventUseCase,
    private readonly escalateToPendingBitrixUseCase: EscalateToPendingBitrixUseCase,
    private readonly executePendingSideEffectsUseCase: ExecutePendingSideEffectsUseCase,
  ) {}

  async execute(command: IngestReplyCommand): Promise<IngestReplyOutcome> {
    const existing =
      await this.customerMessageRepository.findByExternalMessageId(
        command.messageId,
      );
    if (existing) {
      const { workflow } = await this.getWorkflowContextUseCase.execute({
        workflowId: existing.workflow_id,
      });
      return {
        type: 'already_ingested',
        workflow,
        customerMessageId: existing.id,
      };
    }

    const ingestIdempotencyKey = `${command.messageId}:ingest_reply`;
    const idempotencyResult = await this.checkIdempotencyUseCase.execute({
      idempotencyKey: ingestIdempotencyKey,
      scope: 'ingest_reply',
      requestId: command.requestId,
    });
    const isIdempotencyDuplicate = idempotencyResult.isDuplicate;

    if (isIdempotencyDuplicate) {
      const raced =
        await this.customerMessageRepository.findByExternalMessageId(
          command.messageId,
        );
      if (raced) {
        const { workflow } = await this.getWorkflowContextUseCase.execute({
          workflowId: raced.workflow_id,
        });
        return {
          type: 'already_ingested',
          workflow,
          customerMessageId: raced.id,
        };
      }
    }

    const outgoing = await this.replyWorkflowMatcher.matchOutgoingMessage({
      inReplyTo: command.inReplyTo,
      threadId: command.threadId,
    });

    if (!outgoing) {
      if (!isIdempotencyDuplicate) {
        this.escalateUnmatchedReplyUseCase.execute({
          ingest: command,
          reason: 'no_workflow_match',
        });
      }
      return {
        type: 'escalated_unmatched',
        reason: 'no_workflow_match',
        isDuplicate: isIdempotencyDuplicate,
      };
    }

    await this.checkIdempotencyUseCase.linkWorkflowId(
      ingestIdempotencyKey,
      outgoing.workflow_id,
    );

    const { workflow } = await this.getWorkflowContextUseCase.execute({
      workflowId: outgoing.workflow_id,
    });

    if (workflow.status !== WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY) {
      return this.escalate(
        outgoing.workflow_id,
        `unexpected_workflow_status_${workflow.status}`,
        command.requestId,
      );
    }

    let message;
    try {
      message = await this.customerMessageRepository.create({
        workflow_id: outgoing.workflow_id,
        direction: MessageDirection.INBOUND,
        subject: command.subject,
        body: command.bodyText,
        from_address: command.fromEmail,
        to_address: command.toEmails.join(','),
        external_message_id: command.messageId,
      });
    } catch (error) {
      if (error instanceof DuplicateCustomerMessageError) {
        const raced =
          await this.customerMessageRepository.findByExternalMessageId(
            command.messageId,
          );
        if (raced) {
          const { workflow } = await this.getWorkflowContextUseCase.execute({
            workflowId: raced.workflow_id,
          });
          return {
            type: 'already_ingested',
            workflow,
            customerMessageId: raced.id,
          };
        }
      }
      throw error;
    }

    const attachments = await this.attachmentRepository.createMany(
      command.attachments.map((attachment) => ({
        message_id: message.id,
        workflow_id: outgoing.workflow_id,
        filename: attachment.filename,
        content_type: attachment.mimeType,
        storage_ref: attachment.contentRef,
        content_base64: attachment.contentBase64 ?? null,
      })),
    );

    const urls = extractUrlsFromEmailBody(command.bodyText);
    const links = await this.linkRepository.createMany(
      urls.map((url) => ({
        message_id: message.id,
        workflow_id: outgoing.workflow_id,
        url,
      })),
    );

    await this.emitWorkflowEventUseCase.execute({
      workflowId: outgoing.workflow_id,
      eventType: WorkflowEventType.CUSTOMER_REPLY_RECEIVED,
      statusBefore: workflow.status,
      statusAfter: workflow.status,
      payload: {
        customerMessageId: message.id,
        externalMessageId: command.messageId,
        attachmentCount: attachments.length,
        linkCount: links.length,
        ...(await this.buildIngestObservabilityPayload(
          outgoing.workflow_id,
          attachments.length,
        )),
      },
      requestId: command.requestId,
    });

    return {
      type: 'ingested',
      workflow,
      customerMessageId: message.id,
      attachmentIds: attachments.map((row) => row.id),
      linkIds: links.map((row) => row.id),
    };
  }

  private async buildIngestObservabilityPayload(
    workflowId: string,
    attachmentCount: number,
  ): Promise<Record<string, unknown>> {
    const requirements =
      await this.requirementRepository.findByWorkflowId(workflowId);
    const hasPhotoRequired = requirements.some(
      (row) => row.label === RequirementLabel.PHOTO_REQUIRED,
    );
    if (hasPhotoRequired && attachmentCount === 0) {
      return { photoReplyWithoutAttachments: true };
    }
    return {};
  }

  private async escalate(
    workflowId: string,
    reason: string,
    requestId?: string,
  ): Promise<IngestReplyOutcome> {
    const { workflow } = await this.getWorkflowContextUseCase.execute({
      workflowId,
    });

    const terminalStatuses = new Set<WorkflowStatus>([
      WorkflowStatus.COMPLETED,
      WorkflowStatus.ESCALATED,
      WorkflowStatus.FAILED,
    ]);

    if (terminalStatuses.has(workflow.status)) {
      return {
        type: 'rejected',
        workflow,
        reason: `cannot_escalate_from_${workflow.status}`,
      };
    }

    const pending = await this.escalateToPendingBitrixUseCase.execute({
      workflowId,
      reason,
      requestId,
    });
    const executed = await this.executePendingSideEffectsUseCase.execute({
      workflowId,
      requestId,
    });
    const resolved =
      executed.type === 'escalated' || executed.type === 'blocked'
        ? executed.workflow
        : pending.workflow;

    return {
      type: 'escalated',
      capability: buildCapabilityResult(resolved),
      workflow: resolved,
      reason,
    };
  }
}
