-- task-07: follow-up tracking + escalation pending Bitrix gate
SET search_path TO postsale_agent_evapremium;

ALTER TYPE workflow_status ADD VALUE IF NOT EXISTS 'ESCALATION_PENDING_BITRIX_UPDATE';

ALTER TABLE postsale_workflows
  ADD COLUMN IF NOT EXISTS follow_up_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_follow_up_at TIMESTAMPTZ;
