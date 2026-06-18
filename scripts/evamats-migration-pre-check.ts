/**
 * EVAMATS migration pre-check — parse-only, no Supabase writes.
 *
 * Usage:
 *   npx ts-node scripts/evamats-migration-pre-check.ts --file="./path/to/evamats.xlsx"
 */
import { parseWorkbookFile } from '../src/domains/template-import/parsers/excel-row.parser';
import { TemplateNormalizationService } from '../src/domains/template-import/services/template-normalization.service';

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
      'Usage: npx ts-node scripts/evamats-migration-pre-check.ts --file=./path/to/evamats.xlsx',
    );
    process.exit(1);
  }

  const normalization = new TemplateNormalizationService();
  const { rows, rejectedCount } = parseWorkbookFile(filePath);

  let expectedNotes = 0;
  const productSlugs = new Set<string>();
  const bodyTypeSlugs = new Set<string>();

  for (const row of rows) {
    expectedNotes += row.notes.length;
    const normalized = normalization.normalizeVehicleFields({
      brand: row.brand,
      model: row.model,
      bodyType: row.bodyType,
      generation: row.generation,
    });
    bodyTypeSlugs.add(normalized.bodyType);
    for (const note of row.notes) {
      productSlugs.add(normalization.normalizeProduct(note.product));
      bodyTypeSlugs.add(normalization.normalizeBodyType(note.bodyType));
    }
  }

  const templatesWithNotes = rows.filter((row) => row.notes.length > 0).length;
  const templatesWithoutNotes = rows.length - templatesWithNotes;
  const maxNotesPerRow = rows.reduce(
    (max, row) => Math.max(max, row.notes.length),
    0,
  );

  console.log(
    JSON.stringify(
      {
        filePath,
        expectedTemplates: rows.length,
        expectedRejected: rejectedCount,
        expectedNotes,
        templatesWithNotes,
        templatesWithoutNotes,
        maxNotesPerRow,
        distinctBodyTypeSlugs: bodyTypeSlugs.size,
        distinctProductSlugs: productSlugs.size,
        sampleNormalizedTemplate: rows[0]
          ? normalization.normalizeVehicleFields({
              brand: rows[0].brand,
              model: rows[0].model,
              bodyType: rows[0].bodyType,
              generation: rows[0].generation,
            })
          : null,
      },
      null,
      2,
    ),
  );
}

main();
