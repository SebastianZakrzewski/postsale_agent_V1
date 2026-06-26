import { CarTemplateNoteColumn } from './slug-mappings';

export type CarTemplateNotes = Record<CarTemplateNoteColumn, string | null>;

export interface EvamatsWideTemplateRow {
  brand: string;
  model: string;
  generation: string | null;
  body_type_1: string;
  body_type_2: string | null;
  body_type_3: string | null;
  notes: CarTemplateNotes;
  raw_row_json: Record<string, unknown>;
}

export interface EvamatsParseStats {
  parsedRows: number;
  rejectedRows: number;
  duplicateRows: number;
  templatesWithNotes: number;
  filledNoteCells: number;
}

export interface EvamatsParseResult {
  rows: EvamatsWideTemplateRow[];
  stats: EvamatsParseStats;
}
