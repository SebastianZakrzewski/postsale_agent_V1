import { CarTemplateRow, CarTemplateNoteRow } from '../../../lib/persistence';

export interface InsertCarTemplateInput {
  importBatchId: string;
  brand: string;
  model: string;
  bodyType: string;
  generation: string | null;
  aliases: string[];
  rawRowJson: Record<string, unknown>;
}

export interface InsertCarTemplateNoteInput {
  carTemplateId: string;
  product: string;
  bodyType: string;
  noteText: string;
  sourceField: string | null;
}

export abstract class CarTemplateRepository {
  abstract findByNormalizedKey(
    brand: string,
    model: string,
    bodyType: string,
    generation: string | null,
  ): Promise<CarTemplateRow[]>;
  abstract findByAlias(normalizedAlias: string): Promise<CarTemplateRow[]>;
  abstract insertTemplate(
    input: InsertCarTemplateInput,
  ): Promise<CarTemplateRow>;
  abstract insertNotes(
    notes: InsertCarTemplateNoteInput[],
  ): Promise<CarTemplateNoteRow[]>;
  abstract findNotesByTemplateId(
    templateId: string,
    product: string,
    bodyType: string,
  ): Promise<CarTemplateNoteRow[]>;
}

export const CAR_TEMPLATE_REPOSITORY = Symbol('CAR_TEMPLATE_REPOSITORY');
