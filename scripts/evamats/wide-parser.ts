import * as XLSX from 'xlsx';
import {
  buildMatchKey,
  normalizeGeneration,
  normalizeIdentifier,
  normalizeOptionalBodyType,
} from './normalization';
import {
  CAR_TEMPLATE_NOTE_COLUMNS,
  EVAMATS_NOTE_COLUMN_TO_DB,
  EVAMATS_SHEET_NAME,
  EVAMATS_VEHICLE_COLUMNS,
  CarTemplateNoteColumn,
} from './slug-mappings';
import {
  CarTemplateNotes,
  EvamatsParseResult,
  EvamatsWideTemplateRow,
} from './wide-types';

function readCell(row: Record<string, unknown>, column: string): string | null {
  const value = row[column];
  if (value == null) {
    return null;
  }
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function emptyNotes(): CarTemplateNotes {
  return CAR_TEMPLATE_NOTE_COLUMNS.reduce((acc, column) => {
    acc[column] = null;
    return acc;
  }, {} as CarTemplateNotes);
}

function extractNotes(rawRow: Record<string, unknown>): CarTemplateNotes {
  const notes = emptyNotes();

  for (const [excelColumn, dbColumn] of Object.entries(
    EVAMATS_NOTE_COLUMN_TO_DB,
  )) {
    const noteText = readCell(rawRow, excelColumn);
    if (!noteText) {
      continue;
    }
    notes[dbColumn as CarTemplateNoteColumn] = noteText;
  }

  return notes;
}

function countFilledNotes(notes: CarTemplateNotes): number {
  return CAR_TEMPLATE_NOTE_COLUMNS.filter((column) => notes[column] != null)
    .length;
}

function parseRawRow(
  rawRow: Record<string, unknown>,
): { row?: EvamatsWideTemplateRow; rejected: boolean } {
  const brandRaw = readCell(rawRow, EVAMATS_VEHICLE_COLUMNS.brand);
  const modelRaw = readCell(rawRow, EVAMATS_VEHICLE_COLUMNS.model);
  const bodyType1Raw = readCell(rawRow, EVAMATS_VEHICLE_COLUMNS.bodyType1);
  const bodyType2Raw = readCell(rawRow, EVAMATS_VEHICLE_COLUMNS.bodyType2);
  const bodyType3Raw = readCell(rawRow, EVAMATS_VEHICLE_COLUMNS.bodyType3);

  const bodyType1Source =
    bodyType1Raw ?? bodyType2Raw ?? bodyType3Raw;

  if (!brandRaw || !modelRaw || !bodyType1Source) {
    return { rejected: true };
  }

  const brand = normalizeIdentifier(brandRaw);
  const model = normalizeIdentifier(modelRaw);
  const body_type_1 = normalizeOptionalBodyType(
    bodyType1Raw ?? bodyType1Source,
  );
  const body_type_2 = normalizeOptionalBodyType(bodyType2Raw);
  const body_type_3 = normalizeOptionalBodyType(bodyType3Raw);

  if (!brand || !model || !body_type_1) {
    return { rejected: true };
  }

  const aliasesRaw = readCell(rawRow, EVAMATS_VEHICLE_COLUMNS.aliases);
  const raw_row_json: Record<string, unknown> = { ...rawRow };
  if (aliasesRaw) {
    raw_row_json._normalized_aliases = aliasesRaw
      .split(/[,;\n]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => normalizeIdentifier(part))
      .filter(Boolean);
  }

  return {
    row: {
      brand,
      model,
      generation: normalizeGeneration(
        readCell(rawRow, EVAMATS_VEHICLE_COLUMNS.generation),
      ),
      body_type_1,
      body_type_2,
      body_type_3,
      notes: extractNotes(rawRow),
      raw_row_json,
    },
  };
}

function resolveSheetName(workbook: XLSX.WorkBook): string | undefined {
  if (workbook.SheetNames.includes(EVAMATS_SHEET_NAME)) {
    return EVAMATS_SHEET_NAME;
  }
  return workbook.SheetNames[0];
}

function dedupeRows(rows: EvamatsWideTemplateRow[]): {
  uniqueRows: EvamatsWideTemplateRow[];
  duplicateRows: number;
} {
  const seen = new Set<string>();
  const uniqueRows: EvamatsWideTemplateRow[] = [];
  let duplicateRows = 0;

  for (const row of rows) {
    const key = buildMatchKey(row);
    if (seen.has(key)) {
      duplicateRows += 1;
      continue;
    }
    seen.add(key);
    uniqueRows.push(row);
  }

  return { uniqueRows, duplicateRows };
}

export function parseWorkbookFile(filePath: string): EvamatsParseResult {
  const workbook = XLSX.readFile(filePath);
  const sheetName = resolveSheetName(workbook);
  if (!sheetName) {
    return {
      rows: [],
      stats: {
        parsedRows: 0,
        rejectedRows: 0,
        duplicateRows: 0,
        templatesWithNotes: 0,
        filledNoteCells: 0,
      },
    };
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[sheetName],
    { defval: null },
  );

  const parsed: EvamatsWideTemplateRow[] = [];
  let rejectedRows = 0;

  for (const rawRow of rawRows) {
    const result = parseRawRow(rawRow);
    if (result.rejected || !result.row) {
      rejectedRows += 1;
      continue;
    }
    parsed.push(result.row);
  }

  const { uniqueRows, duplicateRows } = dedupeRows(parsed);
  let templatesWithNotes = 0;
  let filledNoteCells = 0;

  for (const row of uniqueRows) {
    const count = countFilledNotes(row.notes);
    if (count > 0) {
      templatesWithNotes += 1;
    }
    filledNoteCells += count;
  }

  return {
    rows: uniqueRows,
    stats: {
      parsedRows: uniqueRows.length,
      rejectedRows,
      duplicateRows,
      templatesWithNotes,
      filledNoteCells,
    },
  };
}
