-- Langflow run audit: parse outcome metadata only (no raw LLM persistence).
ALTER TABLE langflow_runs
  ADD COLUMN parsed_success BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN validation_errors TEXT;

ALTER TABLE langflow_runs
  ALTER COLUMN parsed_success DROP DEFAULT;

COMMENT ON COLUMN langflow_runs.raw_output IS
  'Deprecated: application must always write NULL. Raw LLM output must not be persisted.';
