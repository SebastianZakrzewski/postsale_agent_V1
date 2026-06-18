/**
 * Generates batched SQL for EVAMATS one-time data migration (task-11).
 * Use when Supabase MCP execute_sql is available without local .env.
 *
 * Usage:
 *   npx ts-node scripts/generate-evamats-migration-sql.ts --file="..." --out=./scripts/output/evamats-batches
 */
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { parseWorkbookFile } from '../src/domains/template-import/parsers/excel-row.parser';
import { TemplateNormalizationService } from '../src/domains/template-import/services/template-normalization.service';
import { ImportRowDto } from '../src/domains/template-import/dto/import-row.dto';

const BATCH_SIZE = 25;

function parseArgs(argv: string[]): { filePath?: string; outDir?: string } {
  const fileArg = argv.find((arg) => arg.startsWith('--file='));
  const outArg = argv.find((arg) => arg.startsWith('--out='));
  return {
    filePath: fileArg?.slice('--file='.length),
    outDir: outArg?.slice('--out='.length) ?? './scripts/output/evamats-batches',
  };
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlJson(value: Record<string, unknown>): string {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

function sqlTextArray(values: string[]): string {
  if (values.length === 0) {
    return 'ARRAY[]::text[]';
  }
  return `ARRAY[${values.map(sqlLiteral).join(', ')}]::text[]`;
}

function buildTemplateAliases(
  row: ImportRowDto,
  normalized: {
    brand: string;
    model: string;
    bodyType: string;
    generation: string | null;
  },
  normalization: TemplateNormalizationService,
): string[] {
  const aliasSet = new Set<string>(
    normalization.normalizeAliases(row.aliases),
  );
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

function main(): void {
  const { filePath, outDir } = parseArgs(process.argv.slice(2));
  if (!filePath) {
    console.error(
      'Usage: npx ts-node scripts/generate-evamats-migration-sql.ts --file=./evamats.xlsx [--out=./scripts/output/evamats-batches]',
    );
    process.exit(1);
  }

  const normalization = new TemplateNormalizationService();
  const { rows, rejectedCount } = parseWorkbookFile(filePath);
  const batchId = randomUUID();
  const sourceFilename = path.basename(filePath);

  fs.mkdirSync(outDir!, { recursive: true });

  const manifest = {
    batchId,
    sourceFilename,
    expectedTemplates: rows.length,
    expectedRejected: rejectedCount,
    expectedNotes: 0,
    templateBatches: 0,
    noteBatches: 0,
  };

  const templateRecords: Array<{
    templateId: string;
    row: ImportRowDto;
    normalized: ReturnType<TemplateNormalizationService['normalizeVehicleFields']>;
    aliases: string[];
  }> = [];

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
    templateRecords.push({
      templateId: randomUUID(),
      row,
      normalized,
      aliases: buildTemplateAliases(row, normalized, normalization),
    });
  }

  const batchFiles: string[] = [];

  batchFiles.push(
    writeBatchFile(outDir!, 0, [
      `INSERT INTO postsale_agent_evapremium.template_import_batches`,
      `(id, source_filename, row_count, error_count, status)`,
      `VALUES (${sqlLiteral(batchId)}, ${sqlLiteral(sourceFilename)}, 0, ${rejectedCount}, 'pending');`,
    ]),
  );

  for (let i = 0; i < templateRecords.length; i += BATCH_SIZE) {
    const chunk = templateRecords.slice(i, i + BATCH_SIZE);
    const values = chunk
      .map(({ templateId, normalized, aliases, row }) =>
        [
          '(',
          [
            sqlLiteral(templateId),
            sqlLiteral(batchId),
            sqlLiteral(normalized.brand),
            sqlLiteral(normalized.model),
            sqlLiteral(normalized.bodyType),
            normalized.generation
              ? sqlLiteral(normalized.generation)
              : 'NULL',
            sqlTextArray(aliases),
            sqlJson(row.rawRowJson),
          ].join(', '),
          ')',
        ].join(''),
      )
      .join(',\n');

    batchFiles.push(
      writeBatchFile(outDir!, batchFiles.length, [
        `INSERT INTO postsale_agent_evapremium.car_templates`,
        `(id, import_batch_id, brand, model, body_type, generation, aliases, raw_row_json)`,
        `VALUES ${values};`,
      ]),
    );
    manifest.templateBatches += 1;
  }

  const noteRecords: Array<{
    noteId: string;
    templateId: string;
    product: string;
    bodyType: string;
    noteText: string;
    sourceField: string | null;
  }> = [];

  for (const record of templateRecords) {
    for (const note of record.row.notes) {
      noteRecords.push({
        noteId: randomUUID(),
        templateId: record.templateId,
        product: normalization.normalizeProduct(note.product),
        bodyType: normalization.normalizeBodyType(note.bodyType),
        noteText: note.noteText.trim(),
        sourceField: normalization.normalizeSourceField(note.sourceField),
      });
    }
  }

  for (let i = 0; i < noteRecords.length; i += BATCH_SIZE) {
    const chunk = noteRecords.slice(i, i + BATCH_SIZE);
    const values = chunk
      .map((note) =>
        [
          '(',
          [
            sqlLiteral(note.noteId),
            sqlLiteral(note.templateId),
            sqlLiteral(note.product),
            sqlLiteral(note.bodyType),
            sqlLiteral(note.noteText),
            note.sourceField ? sqlLiteral(note.sourceField) : 'NULL',
          ].join(', '),
          ')',
        ].join(''),
      )
      .join(',\n');

    batchFiles.push(
      writeBatchFile(outDir!, batchFiles.length, [
        `INSERT INTO postsale_agent_evapremium.car_template_notes`,
        `(id, car_template_id, product, body_type, note_text, source_field)`,
        `VALUES ${values};`,
      ]),
    );
    manifest.noteBatches += 1;
  }

  const importedCount = templateRecords.length;
  batchFiles.push(
    writeBatchFile(outDir!, batchFiles.length, [
      `UPDATE postsale_agent_evapremium.template_import_batches`,
      `SET row_count = ${importedCount},`,
      `    error_count = ${rejectedCount + (rows.length - importedCount)},`,
      `    status = ${importedCount > 0 ? sqlLiteral('completed') : sqlLiteral('failed')},`,
      `    updated_at = now()`,
      `WHERE id = ${sqlLiteral(batchId)};`,
    ]),
  );

  manifest.expectedNotes = noteRecords.length;
  fs.writeFileSync(
    path.join(outDir!, 'manifest.json'),
    JSON.stringify({ ...manifest, batchFiles, importedCount }, null, 2),
  );

  console.log(JSON.stringify(manifest, null, 2));
}

function writeBatchFile(outDir: string, index: number, lines: string[]): string {
  const filename = `${String(index).padStart(3, '0')}.sql`;
  const filePath = path.join(outDir, filename);
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf-8');
  return filename;
}

main();
