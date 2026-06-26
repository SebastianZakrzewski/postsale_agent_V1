import { CarTemplateWideRow } from '../types';

export abstract class CarTemplateRepository {
  abstract findByVehicleKey(
    brand: string,
    model: string,
    generation: string,
  ): Promise<CarTemplateWideRow[]>;
}

export const CAR_TEMPLATE_REPOSITORY = Symbol('CAR_TEMPLATE_REPOSITORY');
