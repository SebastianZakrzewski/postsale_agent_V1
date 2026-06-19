import { TemplateMatchStatus } from '../enums';

export interface StartWorkflowCommand {
  bitrixDealId: string;
  idempotencyKey: string;
  requestId?: string;
}

export interface EscalateWorkflowCommand {
  workflowId: string;
  reason: string;
  templateMatchStatus?: TemplateMatchStatus;
  requestId?: string;
}

export interface IngestReplyCommand {
  workflowId: string;
  messageId: string;
  body: string;
}
