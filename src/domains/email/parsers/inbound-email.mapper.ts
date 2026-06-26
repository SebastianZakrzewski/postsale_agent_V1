import { N8nInboundEmailDto } from '../dto/n8n-inbound-email.dto';
import { IngestReplyCommand } from '../../../lib/commands/workflow.commands';

export function mapInboundEmailDtoToCommand(
  dto: N8nInboundEmailDto,
  requestId?: string,
): IngestReplyCommand {
  return {
    messageId: dto.messageId,
    threadId: dto.threadId,
    inReplyTo: dto.inReplyTo ?? null,
    fromEmail: dto.from.email,
    fromName: dto.from.name ?? null,
    toEmails: dto.to.map((address) => address.email),
    subject: dto.subject,
    bodyText: dto.bodyText,
    bodyHtml: dto.bodyHtml ?? null,
    receivedAt: dto.receivedAt,
    attachments: (dto.attachments ?? []).map((attachment) => ({
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      contentRef: attachment.contentRef,
      contentBase64: attachment.contentBase64,
    })),
    requestId,
  };
}
