export interface StartWorkflowWebhookDto {
  bitrix_deal_id: string;
  idempotency_key: string;
  request_id?: string;
}

export interface IngestEmailWebhookDto {
  workflow_id?: string;
  message_id: string;
  body: string;
  from_address: string;
}
