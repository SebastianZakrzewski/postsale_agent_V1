-- Recreate car_templates with wide note columns (Human Architect 2026-06-24).
-- Drops legacy narrow car_templates (body_type, aliases) and creates wide notes layout.
-- Keeps template_import_batches; does NOT restore car_template_notes.
-- Re-attaches postsale_workflows.car_template_id FK when column already exists.
SET search_path TO postsale_agent_evapremium;

UPDATE postsale_workflows SET car_template_id = NULL WHERE car_template_id IS NOT NULL;

ALTER TABLE postsale_workflows DROP CONSTRAINT IF EXISTS postsale_workflows_car_template_id_fkey;

DROP TABLE IF EXISTS car_templates CASCADE;

CREATE TABLE car_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  generation TEXT,
  body_type_1 TEXT NOT NULL,
  body_type_2 TEXT,
  body_type_3 TEXT,

  notes_general TEXT,
  notes_front_classic TEXT,
  notes_front_3d TEXT,
  notes_rear_classic TEXT,
  notes_rear_3d TEXT,
  notes_third_row TEXT,

  notes_trunk_general TEXT,
  notes_trunk_estate TEXT,
  notes_trunk_hatchback TEXT,
  notes_trunk_sedan TEXT,
  notes_trunk_liftback TEXT,
  notes_trunk_suv_5_seater TEXT,
  notes_trunk_suv_7_seater TEXT,
  notes_trunk_minivan_5_seater TEXT,
  notes_trunk_minivan_7_seater TEXT,

  import_batch_id UUID REFERENCES template_import_batches(id) ON DELETE SET NULL,
  raw_row_json JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_car_templates_match
  ON car_templates (brand, model, generation, body_type_1);

CREATE INDEX idx_car_templates_body_type_2
  ON car_templates (body_type_2)
  WHERE body_type_2 IS NOT NULL;

CREATE INDEX idx_car_templates_body_type_3
  ON car_templates (body_type_3)
  WHERE body_type_3 IS NOT NULL;

CREATE UNIQUE INDEX uq_car_templates_match_key
  ON car_templates (brand, model, COALESCE(generation, ''), body_type_1);

ALTER TABLE postsale_workflows
  ADD CONSTRAINT postsale_workflows_car_template_id_fkey
  FOREIGN KEY (car_template_id) REFERENCES car_templates(id) ON DELETE SET NULL;

CREATE INDEX idx_postsale_workflows_car_template_id
  ON postsale_workflows (car_template_id)
  WHERE car_template_id IS NOT NULL;

GRANT ALL ON TABLE car_templates TO postgres, service_role;

RESET search_path;
