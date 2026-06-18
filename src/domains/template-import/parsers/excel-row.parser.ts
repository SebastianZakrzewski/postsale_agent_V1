import * as XLSX from 'xlsx';
import {
  DEFAULT_EVAMATS_COLUMN_MAPPING,
  EvamatsColumnMapping,
} from '../config/evamats-column-mapping';
import {
  EVAMATS_NOTE_COLUMN_SLUGS,
  EVAMATS_SHEET_NAME,
  EVAMATS_VEHICLE_COLUMNS,
} from '../config/evamats-slug-mappings';
import {
  ImportNoteDto,
  ImportRowDto,
  ParseRowResult,
} from '../dto/import-row.dto';

function readCell(row: Record<string, unknown>, column: string): string | null {
  const value = row[column];
  if (value == null) {
    return null;
  }
  return String(value).trim();
}

function hasRequiredFields(
  brand: string | null,
  model: string | null,
  bodyType: string | null,
): boolean {
  return (
    brand != null &&
    brand.length > 0 &&
    model != null &&
    model.length > 0 &&
    bodyType != null &&
    bodyType.length > 0
  );
}

function isEvamatsProductionRow(rawRow: Record<string, unknown>): boolean {
  return rawRow[EVAMATS_VEHICLE_COLUMNS.brand] !== undefined;
}

function extractEvamatsNotes(
  rawRow: Record<string, unknown>,
  templateBodyType: string,
): ImportNoteDto[] {
  const notes: ImportNoteDto[] = [];

  for (const [column, mapping] of Object.entries(EVAMATS_NOTE_COLUMN_SLUGS)) {
    const noteText = readCell(rawRow, column);
    if (!noteText) {
      continue;
    }

    notes.push({
      product: mapping.product,
      bodyType: mapping.bodyType ?? templateBodyType,
      noteText,
      sourceField: mapping.sourceField,
    });
  }

  return notes;
}

export function parseEvamatsRawRow(
  rawRow: Record<string, unknown>,
): ParseRowResult {
  const brand = readCell(rawRow, EVAMATS_VEHICLE_COLUMNS.brand);
  const model = readCell(rawRow, EVAMATS_VEHICLE_COLUMNS.model);
  const bodyType =
    readCell(rawRow, EVAMATS_VEHICLE_COLUMNS.bodyType1) ??
    readCell(rawRow, EVAMATS_VEHICLE_COLUMNS.bodyType2) ??
    readCell(rawRow, EVAMATS_VEHICLE_COLUMNS.bodyType3);

  if (!hasRequiredFields(brand, model, bodyType)) {
    return {
      rejected: true,
      reason: 'missing_required_fields',
    };
  }

  const generation = readCell(rawRow, EVAMATS_VEHICLE_COLUMNS.generation);
  const aliasesRaw = readCell(rawRow, EVAMATS_VEHICLE_COLUMNS.aliases);
  const alternateBodyTypes = [
    readCell(rawRow, EVAMATS_VEHICLE_COLUMNS.bodyType2),
    readCell(rawRow, EVAMATS_VEHICLE_COLUMNS.bodyType3),
  ].filter((value): value is string => value != null && value.length > 0);

  const row: ImportRowDto = {
    brand: brand!,
    model: model!,
    bodyType: bodyType!,
    generation,
    aliases: aliasesRaw
      ? aliasesRaw
          .split(/[,;\n]/)
          .map((part) => part.trim())
          .filter(Boolean)
      : [],
    alternateBodyTypes,
    notes: extractEvamatsNotes(rawRow, bodyType!),
    rawRowJson: { ...rawRow },
  };

  return { row, rejected: false };
}

export function parseRawRow(
  rawRow: Record<string, unknown>,
  mapping: EvamatsColumnMapping = DEFAULT_EVAMATS_COLUMN_MAPPING,
): ParseRowResult {
  if (isEvamatsProductionRow(rawRow)) {
    return parseEvamatsRawRow(rawRow);
  }

  const brand = readCell(rawRow, mapping.brand);
  const model = readCell(rawRow, mapping.model);
  const bodyType = readCell(rawRow, mapping.bodyType);

  if (!hasRequiredFields(brand, model, bodyType)) {
    return {
      rejected: true,
      reason: 'missing_required_fields',
    };
  }

  const generation = readCell(rawRow, mapping.generation);
  const aliasesRaw = readCell(rawRow, mapping.aliases);

  const noteProduct = readCell(rawRow, mapping.noteProduct);
  const noteBodyType = readCell(rawRow, mapping.noteBodyType);
  const noteText = readCell(rawRow, mapping.noteText);
  const noteSourceField = readCell(rawRow, mapping.noteSourceField);

  const notes: ImportNoteDto[] = [];
  if (noteProduct && noteBodyType && noteText) {
    notes.push({
      product: noteProduct,
      bodyType: noteBodyType,
      noteText,
      sourceField: noteSourceField,
    });
  }

  const row: ImportRowDto = {
    brand: brand!,
    model: model!,
    bodyType: bodyType!,
    generation,
    aliases: aliasesRaw
      ? aliasesRaw
          .split(/[,;]/)
          .map((part) => part.trim())
          .filter(Boolean)
      : [],
    alternateBodyTypes: [],
    notes,
    rawRowJson: { ...rawRow },
  };

  return { row, rejected: false };
}

function resolveSheetName(workbook: XLSX.WorkBook): string | undefined {
  if (workbook.SheetNames.includes(EVAMATS_SHEET_NAME)) {
    return EVAMATS_SHEET_NAME;
  }
  return workbook.SheetNames[0];
}

function parseSheetRows(
  sheet: XLSX.WorkSheet,
  mapping: EvamatsColumnMapping,
): { rows: ImportRowDto[]; rejectedCount: number } {
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
  });

  const rows: ImportRowDto[] = [];
  let rejectedCount = 0;

  for (const rawRow of rawRows) {
    const result = parseRawRow(rawRow, mapping);
    if (result.rejected || !result.row) {
      rejectedCount += 1;
      continue;
    }
    rows.push(result.row);
  }

  return { rows, rejectedCount };
}

export function parseWorkbookBuffer(
  buffer: Buffer,
  mapping: EvamatsColumnMapping = DEFAULT_EVAMATS_COLUMN_MAPPING,
): { rows: ImportRowDto[]; rejectedCount: number } {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = resolveSheetName(workbook);
  if (!sheetName) {
    return { rows: [], rejectedCount: 0 };
  }

  return parseSheetRows(workbook.Sheets[sheetName], mapping);
}

export function parseWorkbookFile(
  filePath: string,
  mapping: EvamatsColumnMapping = DEFAULT_EVAMATS_COLUMN_MAPPING,
): { rows: ImportRowDto[]; rejectedCount: number } {
  const workbook = XLSX.readFile(filePath);
  const sheetName = resolveSheetName(workbook);
  if (!sheetName) {
    return { rows: [], rejectedCount: 0 };
  }

  return parseSheetRows(workbook.Sheets[sheetName], mapping);
}
