-- Technical failure audit event (distinct from business escalation)
ALTER TYPE postsale_agent_evapremium.workflow_event_type
  ADD VALUE IF NOT EXISTS 'WORKFLOW_FAILED';
