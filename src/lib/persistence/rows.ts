import {
  WorkflowStatus,
  WorkflowEventType,
  RequirementLabel,
  EvidenceType,
  SideEffectType,
  TemplateMatchStatus,
  RequirementStatus,
  SideEffectRecordStatus,
  MessageDirection,
} from '../../lib/enums';

export interface PostsaleWorkflowRow {
  id: string;
  bitrix_deal_id: string;
  status: WorkflowStatus;
  template_match_status: TemplateMatchStatus | null;
  deal_context_json: Record<string, unknown> | null;
  product: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRequirementRow {
  id: string;
  workflow_id: string;
  label: RequirementLabel;
  status: RequirementStatus;
  source_note: string | null;
  source_field: string | null;
  classification_reason: string | null;
  confidence: number | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerMessageRow {
  id: string;
  workflow_id: string;
  direction: MessageDirection;
  subject: string | null;
  body: string | null;
  from_address: string | null;
  to_address: string | null;
  external_message_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageAttachmentRow {
  id: string;
  message_id: string;
  workflow_id: string;
  filename: string;
  content_type: string | null;
  storage_ref: string | null;
  created_at: string;
}

export interface MessageLinkRow {
  id: string;
  message_id: string;
  workflow_id: string;
  url: string;
  created_at: string;
}

export interface RequirementEvidenceRow {
  id: string;
  requirement_id: string;
  workflow_id: string;
  evidence_type: EvidenceType;
  source_ref: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export interface LangflowRunRow {
  id: string;
  workflow_id: string;
  flow_name: string;
  request_id: string | null;
  raw_output: Record<string, unknown> | null;
  created_at: string;
}

export interface OutgoingMessageRow {
  id: string;
  workflow_id: string;
  customer_message_id: string | null;
  to_address: string;
  subject: string | null;
  body: string | null;
  provider_message_id: string | null;
  created_at: string;
}

export interface WorkflowEventRow {
  id: string;
  workflow_id: string;
  event_type: WorkflowEventType;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface SideEffectRecordRow {
  id: string;
  workflow_id: string;
  side_effect_type: SideEffectType;
  idempotency_key: string;
  status: SideEffectRecordStatus;
  retry_allowed: boolean;
  error_code: string | null;
  provider_response: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface IdempotencyKeyRow {
  id: string;
  idempotency_key: string;
  scope: string;
  workflow_id: string | null;
  created_at: string;
}
