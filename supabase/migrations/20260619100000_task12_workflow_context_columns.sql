-- task-12: persist deal context snapshot and matched car template on workflow row
SET search_path TO postsale_agent_evapremium;

ALTER TABLE postsale_workflows
  ADD COLUMN deal_context_json JSONB,
  ADD COLUMN car_template_id UUID REFERENCES car_templates(id),
  ADD COLUMN product TEXT;
