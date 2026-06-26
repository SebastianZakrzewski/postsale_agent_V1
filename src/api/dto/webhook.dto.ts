export interface StartWorkflowWebhookDto {
  bitrix_deal_id: string;
  idempotency_key: string;
  request_id?: string;
}

export interface IngestEmailWebhookDto extends Record<string, unknown> {
  messageId: string;
  threadId: string;
  inReplyTo?: string | null;
  from: { email: string; name?: string | null };
  to: Array<{ email: string; name?: string | null }>;
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
  receivedAt: string;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    sizeBytes: number;
    contentRef: string;
  }>;
  request_id?: string;
}

export interface FollowupCheckWebhookDto {
  workflow_id: string;
  now?: string;
  request_id?: string;
}
