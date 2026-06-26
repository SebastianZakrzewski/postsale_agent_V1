import { CarTemplateRow } from '../rows';
import { CarTemplateWideRow } from '../../../domains/template-matching/types';

export function toCarTemplateWideRow(row: CarTemplateRow): CarTemplateWideRow {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    generation: row.generation,
    body_type_1: row.body_type_1,
    body_type_2: row.body_type_2,
    body_type_3: row.body_type_3,
    notes_general: row.notes_general,
    notes_front_classic: row.notes_front_classic,
    notes_front_3d: row.notes_front_3d,
    notes_rear_classic: row.notes_rear_classic,
    notes_rear_3d: row.notes_rear_3d,
    notes_third_row: row.notes_third_row,
    notes_trunk_general: row.notes_trunk_general,
    notes_trunk_estate: row.notes_trunk_estate,
    notes_trunk_hatchback: row.notes_trunk_hatchback,
    notes_trunk_sedan: row.notes_trunk_sedan,
    notes_trunk_liftback: row.notes_trunk_liftback,
    notes_trunk_suv_5_seater: row.notes_trunk_suv_5_seater,
    notes_trunk_suv_7_seater: row.notes_trunk_suv_7_seater,
    notes_trunk_minivan_5_seater: row.notes_trunk_minivan_5_seater,
    notes_trunk_minivan_7_seater: row.notes_trunk_minivan_7_seater,
  };
}
