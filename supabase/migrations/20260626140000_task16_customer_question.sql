-- task-16: persist customer-facing question from Langflow classify for analyze/email flows
SET search_path TO postsale_agent_evapremium;

ALTER TABLE workflow_requirements
  ADD COLUMN IF NOT EXISTS customer_question TEXT;

COMMENT ON COLUMN workflow_requirements.customer_question IS
  'Polish customer-facing question from classify-template-notes question_text';
