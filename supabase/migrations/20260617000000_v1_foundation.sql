-- Postsale Agent V1 foundation schema (dedicated namespace)
-- Target schema: postsale_agent_evapremium
-- Apply: supabase db push  OR  supabase migration up  OR  Supabase MCP apply_migration

CREATE SCHEMA IF NOT EXISTS postsale_agent_evapremium;

GRANT USAGE ON SCHEMA postsale_agent_evapremium TO postgres, service_role;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

SET search_path TO postsale_agent_evapremium;

CREATE TYPE workflow_status AS ENUM (
  'STARTED',
  'CONTEXT_LOADED',
  'TEMPLATE_MATCHED',
  'REQUIREMENTS_CREATED',
  'WAITING_FOR_CUSTOMER_REPLY',
  'REQUIREMENTS_UPDATED',
  'COMPLETION_PENDING_BITRIX_UPDATE',
  'COMPLETED',
  'ESCALATED',
  'FAILED'
);

CREATE TYPE workflow_event_type AS ENUM (
  'WORKFLOW_STARTED',
  'DEAL_CONTEXT_LOADED',
  'TEMPLATE_MATCH_SUCCEEDED',
  'REQUIREMENTS_CLASSIFIED',
  'WORKFLOW_REQUIREMENTS_CREATED',
  'INITIAL_EMAIL_SENT',
  'CUSTOMER_REPLY_RECEIVED',
  'REPLY_ANALYSIS_ACCEPTED',
  'REQUIREMENT_STATUSES_UPDATED',
  'COMPLETION_POLICY_PASSED',
  'BITRIX_STAGE_UPDATE_SUCCEEDED',
  'WORKFLOW_COMPLETED',
  'WORKFLOW_ESCALATED'
);

CREATE TYPE requirement_label AS ENUM (
  'YES_NO_INFO',
  'OPTION_SELECTION',
  'MEASUREMENT',
  'TEXT_CONFIRMATION',
  'PHOTO_REQUIRED'
);

CREATE TYPE requirement_status AS ENUM (
  'PENDING',
  'VALID',
  'PARTIAL',
  'UNCLEAR',
  'NOT_APPLICABLE'
);

CREATE TYPE evidence_type AS ENUM (
  'TEXT_FRAGMENT',
  'EMAIL_ATTACHMENT',
  'EXTERNAL_LINK',
  'MANUAL_APPROVAL'
);

CREATE TYPE side_effect_type AS ENUM (
  'SEND_INITIAL_EMAIL',
  'SEND_FOLLOWUP_EMAIL',
  'UPDATE_BITRIX_STAGE_TO_COMPLETED',
  'UPDATE_BITRIX_STAGE_TO_ESCALATED',
  'CREATE_BITRIX_COMMENT',
  'SEND_TELEGRAM_NOTIFICATION'
);

CREATE TYPE side_effect_record_status AS ENUM (
  'PENDING',
  'SUCCEEDED',
  'FAILED'
);

CREATE TYPE template_match_status AS ENUM (
  'MATCHED',
  'NOT_FOUND',
  'AMBIGUOUS'
);

CREATE TYPE message_direction AS ENUM (
  'INBOUND',
  'OUTBOUND'
);

CREATE TABLE template_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_filename TEXT,
  row_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE car_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id UUID REFERENCES template_import_batches(id) ON DELETE SET NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  body_type TEXT NOT NULL,
  generation TEXT,
  aliases TEXT[],
  raw_row_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_car_templates_normalized ON car_templates (brand, model, body_type, generation);

CREATE TABLE car_template_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_template_id UUID NOT NULL REFERENCES car_templates(id) ON DELETE CASCADE,
  product TEXT NOT NULL,
  body_type TEXT NOT NULL,
  note_text TEXT NOT NULL,
  source_field TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_car_template_notes_template ON car_template_notes (car_template_id);

CREATE TABLE postsale_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bitrix_deal_id TEXT NOT NULL,
  status workflow_status NOT NULL DEFAULT 'STARTED',
  template_match_status template_match_status,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_postsale_workflows_bitrix_deal_id ON postsale_workflows (bitrix_deal_id);
CREATE INDEX idx_postsale_workflows_status ON postsale_workflows (status);

CREATE TABLE workflow_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES postsale_workflows(id) ON DELETE CASCADE,
  label requirement_label NOT NULL,
  status requirement_status NOT NULL DEFAULT 'PENDING',
  source_note TEXT,
  source_field TEXT,
  classification_reason TEXT,
  confidence NUMERIC(5, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_requirements_workflow_id ON workflow_requirements (workflow_id);

CREATE TABLE customer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES postsale_workflows(id) ON DELETE CASCADE,
  direction message_direction NOT NULL,
  subject TEXT,
  body TEXT,
  from_address TEXT,
  to_address TEXT,
  external_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_messages_workflow_id ON customer_messages (workflow_id);

CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES customer_messages(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES postsale_workflows(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT,
  storage_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_message_attachments_workflow_id ON message_attachments (workflow_id);
CREATE INDEX idx_message_attachments_message_id ON message_attachments (message_id);

CREATE TABLE message_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES customer_messages(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES postsale_workflows(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_message_links_workflow_id ON message_links (workflow_id);
CREATE INDEX idx_message_links_message_id ON message_links (message_id);

CREATE TABLE requirement_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES workflow_requirements(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES postsale_workflows(id) ON DELETE CASCADE,
  evidence_type evidence_type NOT NULL,
  source_ref TEXT,
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_requirement_evidence_workflow_id ON requirement_evidence (workflow_id);
CREATE INDEX idx_requirement_evidence_requirement_id ON requirement_evidence (requirement_id);

CREATE TABLE langflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES postsale_workflows(id) ON DELETE CASCADE,
  flow_name TEXT NOT NULL,
  request_id TEXT,
  raw_output JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_langflow_runs_workflow_id ON langflow_runs (workflow_id);

CREATE TABLE outgoing_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES postsale_workflows(id) ON DELETE CASCADE,
  customer_message_id UUID REFERENCES customer_messages(id) ON DELETE SET NULL,
  to_address TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  provider_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outgoing_messages_workflow_id ON outgoing_messages (workflow_id);

CREATE TABLE workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES postsale_workflows(id) ON DELETE CASCADE,
  event_type workflow_event_type NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_events_workflow_id ON workflow_events (workflow_id);
CREATE INDEX idx_workflow_events_event_type ON workflow_events (event_type);

CREATE TABLE side_effect_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES postsale_workflows(id) ON DELETE CASCADE,
  side_effect_type side_effect_type NOT NULL,
  idempotency_key TEXT NOT NULL,
  status side_effect_record_status NOT NULL DEFAULT 'PENDING',
  retry_allowed BOOLEAN NOT NULL DEFAULT false,
  error_code TEXT,
  provider_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_side_effect_records_workflow_id ON side_effect_records (workflow_id);
CREATE UNIQUE INDEX idx_side_effect_records_idempotency_key ON side_effect_records (idempotency_key);

CREATE TABLE idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL,
  scope TEXT NOT NULL,
  workflow_id UUID REFERENCES postsale_workflows(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_idempotency_keys_key ON idempotency_keys (idempotency_key);
CREATE INDEX idx_idempotency_keys_workflow_id ON idempotency_keys (workflow_id);

GRANT ALL ON ALL TABLES IN SCHEMA postsale_agent_evapremium TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA postsale_agent_evapremium TO postgres, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA postsale_agent_evapremium
  GRANT ALL ON TABLES TO postgres, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA postsale_agent_evapremium
  GRANT ALL ON SEQUENCES TO postgres, service_role;

RESET search_path;
