-- Remove EVAMATS car template persistence (Human Architect 2026-06-23).
SET search_path TO postsale_agent_evapremium;

ALTER TABLE postsale_workflows
  DROP COLUMN IF EXISTS car_template_id;

DROP TABLE IF EXISTS car_template_notes;
DROP TABLE IF EXISTS car_templates;
DROP TABLE IF EXISTS template_import_batches;

RESET search_path;
