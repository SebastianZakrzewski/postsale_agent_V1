-- EVAMATS post-migration verification (task-11)
-- Run against schema postsale_agent_evapremium on Supabase PROD

SELECT
  (SELECT COUNT(*) FROM postsale_agent_evapremium.template_import_batches) AS batches,
  (SELECT COUNT(*) FROM postsale_agent_evapremium.car_templates) AS templates,
  (SELECT COUNT(*) FROM postsale_agent_evapremium.car_template_notes) AS notes,
  (SELECT COUNT(*) FROM postsale_agent_evapremium.postsale_workflows) AS workflows;

SELECT id, source_filename, row_count, error_count, status, created_at
FROM postsale_agent_evapremium.template_import_batches
ORDER BY created_at DESC
LIMIT 3;

SELECT brand, model, body_type, generation
FROM postsale_agent_evapremium.car_templates
WHERE brand = 'acura' AND model LIKE 'mdx%'
LIMIT 5;

SELECT n.product, n.body_type, LEFT(n.note_text, 80) AS note_preview, n.source_field
FROM postsale_agent_evapremium.car_template_notes n
JOIN postsale_agent_evapremium.car_templates t ON t.id = n.car_template_id
WHERE t.brand = 'acura' AND t.model LIKE 'mdx%'
LIMIT 10;

SELECT product, COUNT(*) AS note_count
FROM postsale_agent_evapremium.car_template_notes
GROUP BY product
ORDER BY note_count DESC;
