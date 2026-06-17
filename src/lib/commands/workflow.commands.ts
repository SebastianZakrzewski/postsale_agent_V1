export interface StartWorkflowCommand {
  bitrixDealId: string;
  idempotencyKey: string;
}

export interface IngestReplyCommand {
  workflowId: string;
  messageId: string;
  body: string;
}
