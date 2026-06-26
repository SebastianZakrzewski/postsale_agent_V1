/** Untrusted n8n → NestJS payload (decision-log 2026-06-25). */

export interface N8nInboundEmailAddressDto {
  email: string;
  name?: string | null;
}

export interface N8nInboundEmailAttachmentDto {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  contentRef: string;
}

export interface N8nInboundEmailDto {
  messageId: string;
  threadId: string;
  inReplyTo?: string | null;
  from: N8nInboundEmailAddressDto;
  to: N8nInboundEmailAddressDto[];
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
  receivedAt: string;
  attachments?: N8nInboundEmailAttachmentDto[];
}
