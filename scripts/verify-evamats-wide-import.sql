-- Post-import verification for wide car_templates (EVAMATS data migration).

SELECT status, row_count, error_count, source_filename, created_at
FROM postsale_agent_evapremium.template_import_batches
ORDER BY created_at DESC
LIMIT 5;

SELECT COUNT(*) AS car_templates_total
FROM postsale_agent_evapremium.car_templates;

SELECT
  COUNT(*) FILTER (WHERE notes_general IS NOT NULL) AS notes_general,
  COUNT(*) FILTER (WHERE notes_front_classic IS NOT NULL) AS notes_front_classic,
  COUNT(*) FILTER (WHERE notes_front_3d IS NOT NULL) AS notes_front_3d,
  COUNT(*) FILTER (WHERE notes_rear_classic IS NOT NULL) AS notes_rear_classic,
  COUNT(*) FILTER (WHERE notes_rear_3d IS NOT NULL) AS notes_rear_3d,
  COUNT(*) FILTER (WHERE notes_third_row IS NOT NULL) AS notes_third_row,
  COUNT(*) FILTER (WHERE notes_trunk_general IS NOT NULL) AS notes_trunk_general,
  COUNT(*) FILTER (WHERE notes_trunk_estate IS NOT NULL) AS notes_trunk_estate,
  COUNT(*) FILTER (WHERE notes_trunk_hatchback IS NOT NULL) AS notes_trunk_hatchback,
  COUNT(*) FILTER (WHERE notes_trunk_sedan IS NOT NULL) AS notes_trunk_sedan,
  COUNT(*) FILTER (WHERE notes_trunk_liftback IS NOT NULL) AS notes_trunk_liftback,
  COUNT(*) FILTER (WHERE notes_trunk_suv_5_seater IS NOT NULL) AS notes_trunk_suv_5_seater,
  COUNT(*) FILTER (WHERE notes_trunk_suv_7_seater IS NOT NULL) AS notes_trunk_suv_7_seater,
  COUNT(*) FILTER (WHERE notes_trunk_minivan_5_seater IS NOT NULL) AS notes_trunk_minivan_5_seater,
  COUNT(*) FILTER (WHERE notes_trunk_minivan_7_seater IS NOT NULL) AS notes_trunk_minivan_7_seater
FROM postsale_agent_evapremium.car_templates;

SELECT brand, model, generation, body_type_1, body_type_2, body_type_3
FROM postsale_agent_evapremium.car_templates
ORDER BY brand, model
LIMIT 10;

SELECT brand, model, generation, body_type_1, COUNT(*) AS duplicate_count
FROM postsale_agent_evapremium.car_templates
GROUP BY brand, model, generation, body_type_1
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;
