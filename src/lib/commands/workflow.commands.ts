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
  messageId: string;
  threadId: string;
  inReplyTo: string | null;
  fromEmail: string;
  fromName: string | null;
  toEmails: string[];
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  receivedAt: string;
  attachments: Array<{
    filename: string;
    mimeType: string;
    sizeBytes: number;
    contentRef: string;
  }>;
  requestId?: string;
}

export interface AnalyzeReplyCommand {
  workflowId: string;
  customerMessageId: string;
  requestId?: string;
}

export interface LoadDealContextCommand {
  workflowId: string;
  bitrixDealId: string;
  requestId?: string;
}

export interface MatchWorkflowTemplateCommand {
  workflowId: string;
  requestId?: string;
}

export interface GetWorkflowContextQuery {
  workflowId: string;
}

export interface CreateRequirementsCommand {
  workflowId: string;
  requestId?: string;
}

export interface SendInitialEmailCommand {
  workflowId: string;
  recipientEmail: string;
  requestId?: string;
}
