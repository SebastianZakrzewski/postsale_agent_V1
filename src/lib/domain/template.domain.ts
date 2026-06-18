import { TemplateMatchStatus } from '../enums';

export interface CarTemplate {
  id: string;
  brand: string;
  model: string;
  bodyType: string;
  generation: string | null;
  aliases: string[];
}

export interface TemplateNote {
  id: string;
  carTemplateId: string;
  product: string;
  bodyType: string;
  noteText: string;
  sourceField: string | null;
}

export interface TemplateMatchResult {
  status: TemplateMatchStatus;
  carTemplateId?: string;
  matchedTemplates?: CarTemplate[];
  escalationReason?: string;
}

export interface TemplateNotesResult {
  notes: TemplateNote[];
  requiresEscalation: boolean;
}

export interface ImportBatchResult {
  batchId: string;
  rowCount: number;
  errorCount: number;
  status: string;
}
