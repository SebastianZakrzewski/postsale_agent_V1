import {
  N8nInboundEmailAttachmentDto,
  N8nInboundEmailDto,
} from '../dto/n8n-inbound-email.dto';

export class InboundEmailParseError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'InboundEmailParseError';
  }
}

function readString(value: unknown, code: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InboundEmailParseError(code);
  }
  return value.trim();
}

function readOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new InboundEmailParseError('invalid_string_field');
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function parseAddress(value: unknown): { email: string; name: string | null } {
  if (!value || typeof value !== 'object') {
    throw new InboundEmailParseError('missing_from');
  }
  const record = value as Record<string, unknown>;
  return {
    email: readString(record.email, 'missing_from_email'),
    name: readOptionalString(record.name),
  };
}

function parseAttachments(value: unknown): N8nInboundEmailAttachmentDto[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new InboundEmailParseError('invalid_attachments');
  }

  return value.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new InboundEmailParseError(`invalid_attachment_${index}`);
    }
    const record = item as Record<string, unknown>;
    const sizeBytes = record.sizeBytes;
    if (
      typeof sizeBytes !== 'number' ||
      Number.isNaN(sizeBytes) ||
      sizeBytes < 0
    ) {
      throw new InboundEmailParseError(`invalid_attachment_size_${index}`);
    }
    return {
      filename: readString(
        record.filename,
        `missing_attachment_filename_${index}`,
      ),
      mimeType: readString(record.mimeType, `missing_attachment_mime_${index}`),
      sizeBytes,
      contentRef: readString(
        record.contentRef,
        `missing_attachment_content_ref_${index}`,
      ),
    };
  });
}

export function parseN8nInboundEmailDto(payload: unknown): N8nInboundEmailDto {
  if (!payload || typeof payload !== 'object') {
    throw new InboundEmailParseError('invalid_payload');
  }

  const raw = payload as Record<string, unknown>;
  const toRaw = raw.to;
  if (!Array.isArray(toRaw) || toRaw.length === 0) {
    throw new InboundEmailParseError('missing_to');
  }

  return {
    messageId: readString(raw.messageId, 'missing_message_id'),
    threadId: readString(raw.threadId, 'missing_thread_id'),
    inReplyTo: readOptionalString(raw.inReplyTo),
    from: parseAddress(raw.from),
    to: toRaw.map((item, index) => {
      try {
        return parseAddress(item);
      } catch {
        throw new InboundEmailParseError(`invalid_to_address_${index}`);
      }
    }),
    subject: readString(raw.subject, 'missing_subject'),
    bodyText: readString(raw.bodyText, 'missing_body_text'),
    bodyHtml: readOptionalString(raw.bodyHtml),
    receivedAt: readString(raw.receivedAt, 'missing_received_at'),
    attachments: parseAttachments(raw.attachments),
  };
}
