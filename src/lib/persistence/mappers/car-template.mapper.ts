import { CarTemplateRow, CarTemplateNoteRow } from '../rows';
import { CarTemplate, TemplateNote } from '../../domain';

export function toCarTemplate(row: CarTemplateRow): CarTemplate {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    bodyType: row.body_type,
    generation: row.generation,
    aliases: row.aliases ?? [],
  };
}

export function toTemplateNote(row: CarTemplateNoteRow): TemplateNote {
  return {
    id: row.id,
    carTemplateId: row.car_template_id,
    product: row.product,
    bodyType: row.body_type,
    noteText: row.note_text,
    sourceField: row.source_field,
  };
}
