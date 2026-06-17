import { CarTemplateRow, CarTemplateNoteRow } from '../../../lib/persistence';

export abstract class CarTemplateRepository {
  abstract findByNormalizedKey(
    brand: string,
    model: string,
    bodyType: string,
    generation: string | null,
  ): Promise<CarTemplateRow[]>;
  abstract findNotesByTemplateId(
    templateId: string,
    product: string,
    bodyType: string,
  ): Promise<CarTemplateNoteRow[]>;
}

export const CAR_TEMPLATE_REPOSITORY = Symbol('CAR_TEMPLATE_REPOSITORY');
