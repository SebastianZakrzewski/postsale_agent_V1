-- completion confirmation email audit event
SET search_path TO postsale_agent_evapremium;

ALTER TYPE workflow_event_type ADD VALUE IF NOT EXISTS 'COMPLETION_CONFIRMATION_EMAIL_SENT';
