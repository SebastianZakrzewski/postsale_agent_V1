export interface ImportNoteDto {
  product: string;
  bodyType: string;
  noteText: string;
  sourceField?: string | null;
}

export interface ImportRowDto {
  brand: string;
  model: string;
  bodyType: string;
  generation?: string | null;
  aliases: string[];
  alternateBodyTypes: string[];
  notes: ImportNoteDto[];
  rawRowJson: Record<string, unknown>;
}

export interface ImportBatchRequestDto {
  filePath: string;
  sourceFilename?: string;
}

export interface ParseRowResult {
  row?: ImportRowDto;
  rejected: boolean;
  reason?: string;
}
