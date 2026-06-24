import { CarTemplateRepository } from '../../domains/template-matching/repository/car-template.repository.port';
import { CarTemplateWideRow } from '../../domains/template-matching/types';

export class InMemoryCarTemplateRepository extends CarTemplateRepository {
  private readonly templates: CarTemplateWideRow[] = [];

  seed(...rows: CarTemplateWideRow[]): void {
    this.templates.push(...rows);
  }

  async findByVehicleKey(
    brand: string,
    model: string,
    generation: string,
  ): Promise<CarTemplateWideRow[]> {
    return this.templates.filter(
      (row) =>
        row.brand === brand &&
        row.model === model &&
        row.generation === generation,
    );
  }
}

export function buildAcuraMdxTemplate(
  overrides: Partial<CarTemplateWideRow> = {},
): CarTemplateWideRow {
  return {
    id: 'template-acura-mdx',
    brand: 'acura',
    model: 'mdx_2_gen',
    generation: '2006-2013',
    body_type_1: 'suv_7_seater',
    body_type_2: null,
    body_type_3: null,
    notes_general: 'General note',
    notes_front_classic: null,
    notes_front_3d: 'Front 3D note',
    notes_rear_classic: null,
    notes_rear_3d: 'Rear 3D note',
    notes_third_row: null,
    notes_trunk_general: null,
    notes_trunk_estate: null,
    notes_trunk_hatchback: null,
    notes_trunk_sedan: null,
    notes_trunk_liftback: null,
    notes_trunk_suv_5_seater: null,
    notes_trunk_suv_7_seater: 'Trunk SUV 7 note',
    notes_trunk_minivan_5_seater: null,
    notes_trunk_minivan_7_seater: null,
    ...overrides,
  };
}
