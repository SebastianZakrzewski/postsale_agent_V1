/**
 * OPS-ONLY one-time production workaround — NOT the default import path.
 *
 * Used during task-11 PROD migration when Nest CLI import hit batch FK race
 * conditions under load. Recreates missing template_import_batches rows via
 * ensureBatchExists() while inserting templates. Prefer scripts/import-evamats.ts
 * for future imports.
 *
 * Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_SCHEMA in environment.
 *
 * Usage:
 *   npx ts-node scripts/run-evamats-import-standalone.ts --file="C:/path/to/evamats.xlsx"
 */
import { createClient } from '@supabase/supabase-js';
import { parseFileArg } from '../src/lib/cli/parse-file-arg';
import { parseWorkbookFile } from '../src/domains/template-import/parsers/excel-row.parser';
import { TemplateNormalizationService } from '../src/domains/template-import/services/template-normalization.service';
import { ImportRowDto } from '../src/domains/template-import/dto/import-row.dto';

const TEMPLATE_BATCH = 100;
const NOTE_BATCH = 200;
const BATCH_ENSURE_INTERVAL = 25;

function buildTemplateAliases(
  row: ImportRowDto,
  normalized: ReturnType<
    TemplateNormalizationService['normalizeVehicleFields']
  >,
  normalization: TemplateNormalizationService,
): string[] {
  const aliasSet = new Set<string>(normalization.normalizeAliases(row.aliases));
  for (const alternateBodyType of row.alternateBodyTypes) {
    aliasSet.add(
      normalization.buildMatchKey(
        normalized.brand,
        normalized.model,
        alternateBodyType,
        normalized.generation,
      ),
    );
  }
  return [...aliasSet];
}

type BatchRow = {
  id: string;
  source_filename: string;
  row_count: number;
  error_count: number;
  status: string;
};

async function ensureBatchExists(client: any, batch: BatchRow): Promise<void> {
  const { data: existing, error: findError } = await client
    .from('template_import_batches')
    .select('id')
    .eq('id', batch.id)
    .maybeSingle();

  if (findError) {
    throw new Error(`Batch lookup failed: ${findError.message}`);
  }

  if (existing) {
    return;
  }

  const { error: insertError } = await client
    .from('template_import_batches')
    .insert({
      id: batch.id,
      source_filename: batch.source_filename,
      row_count: batch.row_count,
      error_count: batch.error_count,
      status: batch.status,
    } as Record<string, unknown>);

  if (insertError) {
    throw new Error(`Batch recreate failed: ${insertError.message}`);
  }

  console.warn(`Recreated missing import batch ${batch.id}`);
}

async function main(): Promise<void> {
  const filePath = parseFileArg(process.argv.slice(2));
  if (!filePath) {
    console.error(
      'Usage: npx ts-node scripts/run-evamats-import-standalone.ts --file=./evamats.xlsx',
    );
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const schema = process.env.SUPABASE_DB_SCHEMA ?? 'postsale_agent_evapremium';

  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const client = createClient(url, key, { db: { schema } });
  const normalization = new TemplateNormalizationService();
  const { rows, rejectedCount } = parseWorkbookFile(filePath);

  let batchRow: BatchRow | null = null;
  let importedCount = 0;

  try {
    const { data: batch, error: batchError } = await client
      .from('template_import_batches')
      .insert({
        source_filename: filePath.split(/[/\\]/).pop() ?? filePath,
        row_count: 0,
        error_count: rejectedCount,
        status: 'pending',
      })
      .select('*')
      .single();

    if (batchError || !batch) {
      throw new Error(`Batch create failed: ${batchError?.message}`);
    }

    batchRow = batch as BatchRow;
    console.log(`Import batch id: ${batchRow.id}`);

    const templateIdByRowIndex: string[] = [];

    for (const row of rows) {
      const normalized = normalization.normalizeVehicleFields({
        brand: row.brand,
        model: row.model,
        bodyType: row.bodyType,
        generation: row.generation,
      });

      if (!normalization.hasRequiredVehicleFields(normalized)) {
        continue;
      }

      if (importedCount > 0 && importedCount % BATCH_ENSURE_INTERVAL === 0) {
        await ensureBatchExists(client, batchRow);
      }

      const { data: template, error: templateError } = await client
        .from('car_templates')
        .insert({
          import_batch_id: batchRow.id,
          brand: normalized.brand,
          model: normalized.model,
          body_type: normalized.bodyType,
          generation: normalized.generation,
          aliases: buildTemplateAliases(row, normalized, normalization),
          raw_row_json: row.rawRowJson,
        })
        .select('id')
        .single();

      if (templateError || !template) {
        throw new Error(`Template insert failed: ${templateError?.message}`);
      }

      templateIdByRowIndex.push(template.id);
      importedCount += 1;

      if (row.notes.length > 0) {
        const noteRows = row.notes.map((note) => ({
          car_template_id: template.id,
          product: normalization.normalizeProduct(note.product),
          body_type: normalization.normalizeBodyType(note.bodyType),
          note_text: note.noteText.trim(),
          source_field: normalization.normalizeSourceField(note.sourceField),
        }));

        for (let i = 0; i < noteRows.length; i += NOTE_BATCH) {
          const chunk = noteRows.slice(i, i + NOTE_BATCH);
          const { error: noteError } = await client
            .from('car_template_notes')
            .insert(chunk);
          if (noteError) {
            throw new Error(`Note insert failed: ${noteError.message}`);
          }
        }
      }

      if (importedCount % TEMPLATE_BATCH === 0) {
        console.log(`Imported templates: ${importedCount}`);
      }
    }

    const totalRejected = rejectedCount + (rows.length - importedCount);
    const status = importedCount > 0 ? 'completed' : 'failed';

    await ensureBatchExists(client, batchRow);

    const { data: updated, error: updateError } = await client
      .from('template_import_batches')
      .update({
        row_count: importedCount,
        error_count: totalRejected,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', batchRow.id)
      .select('*')
      .single();

    if (updateError) {
      throw new Error(`Batch update failed: ${updateError.message}`);
    }

    console.log(
      JSON.stringify(
        {
          batchId: updated?.id,
          rowCount: updated?.row_count,
          errorCount: updated?.error_count,
          status: updated?.status,
        },
        null,
        2,
      ),
    );

    if (status === 'failed') {
      process.exit(1);
    }
  } catch (error) {
    if (batchRow) {
      const totalRejected = rejectedCount + (rows.length - importedCount);
      await client
        .from('template_import_batches')
        .update({
          row_count: importedCount,
          error_count: totalRejected,
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', batchRow.id);
    }
    throw error;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
