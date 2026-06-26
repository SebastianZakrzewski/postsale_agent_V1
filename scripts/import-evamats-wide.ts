/**
 * One-time EVAMATS wide-layout import into Supabase car_templates.
 *
 * Usage:
 *   npx ts-node scripts/import-evamats-wide.ts --file="./NEW Baza szablonów Evamats.xlsx"
 *
 * Required environment variables:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_DB_SCHEMA (optional, defaults to postsale_agent_evapremium)
 */
import { createClient } from '@supabase/supabase-js';
import { loadProjectDotEnv } from '../src/lib/cli/load-dotenv';
import { parseFileArg } from '../src/lib/cli/parse-file-arg';
import { CAR_TEMPLATE_NOTE_COLUMNS } from './evamats/slug-mappings';
import { newBatchId } from './evamats/sql-utils';
import { parseWorkbookFile } from './evamats/wide-parser';
import { EvamatsWideTemplateRow } from './evamats/wide-types';

const INSERT_BATCH_SIZE = 50;
const DEFAULT_DB_SCHEMA = 'postsale_agent_evapremium';

function toInsertRecord(batchId: string, row: EvamatsWideTemplateRow) {
  return {
    import_batch_id: batchId,
    brand: row.brand,
    model: row.model,
    generation: row.generation,
    body_type_1: row.body_type_1,
    body_type_2: row.body_type_2,
    body_type_3: row.body_type_3,
    ...row.notes,
    raw_row_json: row.raw_row_json,
  };
}

async function main(): Promise<void> {
  loadProjectDotEnv();
  const filePath = parseFileArg(process.argv.slice(2));

  if (!filePath) {
    console.error(
      'Usage: npx ts-node scripts/import-evamats-wide.ts --file=./path/to/evamats.xlsx',
    );
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const schema = process.env.SUPABASE_DB_SCHEMA ?? DEFAULT_DB_SCHEMA;

  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const { rows, stats } = parseWorkbookFile(filePath);
  const batchId = newBatchId();
  const sourceFilename = filePath.split(/[\\/]/).pop() ?? filePath;

  const client = createClient(url, key, { db: { schema } });

  const { error: batchInsertError } = await client
    .from('template_import_batches')
    .insert({
      id: batchId,
      source_filename: sourceFilename,
      row_count: 0,
      error_count: stats.rejectedRows + stats.duplicateRows,
      status: 'pending',
    });

  if (batchInsertError) {
    throw batchInsertError;
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
    const chunk = rows.slice(i, i + INSERT_BATCH_SIZE).map((row) =>
      toInsertRecord(batchId, row),
    );

    const { error } = await client.from('car_templates').insert(chunk);
    if (error) {
      throw new Error(
        `Insert failed at offset ${i}: ${error.message} (${error.code ?? 'no_code'})`,
      );
    }
    inserted += chunk.length;
  }

  const { error: batchUpdateError } = await client
    .from('template_import_batches')
    .update({
      row_count: inserted,
      error_count: stats.rejectedRows + stats.duplicateRows,
      status: inserted > 0 ? 'completed' : 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', batchId);

  if (batchUpdateError) {
    throw batchUpdateError;
  }

  console.log(
    JSON.stringify(
      {
        batchId,
        sourceFilename,
        inserted,
        rejectedRows: stats.rejectedRows,
        duplicateRowsSkipped: stats.duplicateRows,
        templatesWithNotes: stats.templatesWithNotes,
        filledNoteCells: stats.filledNoteCells,
        noteColumns: CAR_TEMPLATE_NOTE_COLUMNS,
        status: inserted > 0 ? 'completed' : 'failed',
      },
      null,
      2,
    ),
  );

  if (inserted === 0) {
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
