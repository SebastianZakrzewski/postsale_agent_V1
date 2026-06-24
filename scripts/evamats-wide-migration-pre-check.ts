/**
 * EVAMATS wide-layout migration pre-check — parse-only, no Supabase writes.
 *
 * Usage:
 *   npx ts-node scripts/evamats-wide-migration-pre-check.ts --file="./NEW Baza szablonów Evamats.xlsx"
 */
import { parseWorkbookFile } from './evamats/wide-parser';

function parseArgs(argv: string[]): { filePath?: string } {
  const fileArg = argv.find((arg) => arg.startsWith('--file='));
  if (!fileArg) {
    return {};
  }
  return { filePath: fileArg.slice('--file='.length) };
}

function main(): void {
  const { filePath } = parseArgs(process.argv.slice(2));
  if (!filePath) {
    console.error(
      'Usage: npx ts-node scripts/evamats-wide-migration-pre-check.ts --file=./path/to/evamats.xlsx',
    );
    process.exit(1);
  }

  const { rows, stats } = parseWorkbookFile(filePath);
  const noteColumnFill: Record<string, number> = {};

  for (const row of rows) {
    for (const [column, value] of Object.entries(row.notes)) {
      if (value != null) {
        noteColumnFill[column] = (noteColumnFill[column] ?? 0) + 1;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        filePath,
        expectedTemplates: stats.parsedRows,
        expectedRejected: stats.rejectedRows,
        duplicateRowsSkipped: stats.duplicateRows,
        templatesWithNotes: stats.templatesWithNotes,
        filledNoteCells: stats.filledNoteCells,
        noteColumnFill,
        sampleRow: rows[0] ?? null,
      },
      null,
      2,
    ),
  );
}

main();
