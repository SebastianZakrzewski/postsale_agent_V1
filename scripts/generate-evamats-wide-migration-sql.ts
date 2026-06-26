/**
 * Generates batched SQL for EVAMATS wide car_templates data migration.
 *
 * Usage:
 *   npx ts-node scripts/generate-evamats-wide-migration-sql.ts --file="./NEW Baza szablonów Evamats.xlsx"
 *   npx ts-node scripts/generate-evamats-wide-migration-sql.ts --file=... --out=./scripts/output/evamats-wide-batches
 */
import * as fs from 'fs';
import * as path from 'path';
import { parseWorkbookFile } from './evamats/wide-parser';
import {
  buildTemplateInsertStatement,
  newBatchId,
  newTemplateId,
  sqlLiteral,
} from './evamats/sql-utils';

const TEMPLATE_BATCH_SIZE = 25;

function parseArgs(argv: string[]): { filePath?: string; outDir?: string } {
  const fileArg = argv.find((arg) => arg.startsWith('--file='));
  const outArg = argv.find((arg) => arg.startsWith('--out='));
  return {
    filePath: fileArg?.slice('--file='.length),
    outDir:
      outArg?.slice('--out='.length) ?? './scripts/output/evamats-wide-batches',
  };
}

function writeBatchFile(
  outDir: string,
  index: number,
  lines: string[],
): string {
  const filename = `${String(index).padStart(3, '0')}.sql`;
  const filePath = path.join(outDir, filename);
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf-8');
  return filename;
}

function main(): void {
  const { filePath, outDir } = parseArgs(process.argv.slice(2));
  if (!filePath) {
    console.error(
      'Usage: npx ts-node scripts/generate-evamats-wide-migration-sql.ts --file=./evamats.xlsx [--out=./scripts/output/evamats-wide-batches]',
    );
    process.exit(1);
  }

  const { rows, stats } = parseWorkbookFile(filePath);
  const batchId = newBatchId();
  const sourceFilename = path.basename(filePath);

  fs.mkdirSync(outDir!, { recursive: true });

  const batchFiles: string[] = [];
  batchFiles.push(
    writeBatchFile(outDir!, 0, [
      `INSERT INTO postsale_agent_evapremium.template_import_batches`,
      `(id, source_filename, row_count, error_count, status)`,
      `VALUES (${sqlLiteral(batchId)}, ${sqlLiteral(sourceFilename)}, 0, ${stats.rejectedRows + stats.duplicateRows}, 'pending');`,
    ]),
  );

  let templateBatchCount = 0;
  for (let i = 0; i < rows.length; i += TEMPLATE_BATCH_SIZE) {
    const chunk = rows.slice(i, i + TEMPLATE_BATCH_SIZE);
    const templateIds = chunk.map(() => newTemplateId());
    batchFiles.push(
      writeBatchFile(outDir!, batchFiles.length, [
        buildTemplateInsertStatement(batchId, chunk, templateIds),
      ]),
    );
    templateBatchCount += 1;
  }

  const importedCount = rows.length;
  batchFiles.push(
    writeBatchFile(outDir!, batchFiles.length, [
      `UPDATE postsale_agent_evapremium.template_import_batches`,
      `SET row_count = ${importedCount},`,
      `    error_count = ${stats.rejectedRows + stats.duplicateRows},`,
      `    status = ${importedCount > 0 ? sqlLiteral('completed') : sqlLiteral('failed')},`,
      `    updated_at = now()`,
      `WHERE id = ${sqlLiteral(batchId)};`,
    ]),
  );

  const manifest = {
    batchId,
    sourceFilename,
    expectedTemplates: stats.parsedRows,
    expectedRejected: stats.rejectedRows,
    duplicateRowsSkipped: stats.duplicateRows,
    templatesWithNotes: stats.templatesWithNotes,
    filledNoteCells: stats.filledNoteCells,
    templateBatches: templateBatchCount,
    batchFiles,
    importedCount,
  };

  fs.writeFileSync(
    path.join(outDir!, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  );

  console.log(JSON.stringify(manifest, null, 2));
}

main();
