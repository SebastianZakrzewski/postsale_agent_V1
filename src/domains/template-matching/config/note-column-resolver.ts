import { CarTemplateNoteColumn } from '../../../lib/normalization';
import {
  BodyTypeProfile,
  CarTemplateWideRow,
  ProductLine,
  SetPart,
} from '../types';
export function resolveNoteColumnForPart(
  part: SetPart,
  productLine: ProductLine,
  bodyProfile: BodyTypeProfile,
): CarTemplateNoteColumn {
  if (part === 'general') {
    return 'notes_general';
  }

  if (part === 'third_row') {
    return 'notes_third_row';
  }

  if (part === 'front') {
    return productLine === '3d' ? 'notes_front_3d' : 'notes_front_classic';
  }

  if (part === 'rear') {
    return productLine === '3d' ? 'notes_rear_3d' : 'notes_rear_classic';
  }

  return resolveTrunkNoteColumn(bodyProfile);
}

function resolveTrunkNoteColumn(
  bodyProfile: BodyTypeProfile,
): CarTemplateNoteColumn {
  if (bodyProfile.family === 'suv') {
    if (bodyProfile.seatCount === 7 || bodyProfile.seatCount === 6) {
      return 'notes_trunk_suv_7_seater';
    }
    return 'notes_trunk_suv_5_seater';
  }

  if (bodyProfile.family === 'minivan') {
    if (bodyProfile.seatCount === 7) {
      return 'notes_trunk_minivan_7_seater';
    }
    return 'notes_trunk_minivan_5_seater';
  }

  if (bodyProfile.family === 'estate') {
    return 'notes_trunk_estate';
  }
  if (bodyProfile.family === 'hatchback') {
    return 'notes_trunk_hatchback';
  }
  if (bodyProfile.family === 'sedan') {
    return 'notes_trunk_sedan';
  }
  if (bodyProfile.family === 'liftback') {
    return 'notes_trunk_liftback';
  }

  return 'notes_trunk_general';
}

const TRUNK_NOTE_FALLBACKS: Partial<
  Record<CarTemplateNoteColumn, CarTemplateNoteColumn>
> = {
  notes_trunk_suv_5_seater: 'notes_trunk_general',
};

export function readNoteTextForPart(
  template: CarTemplateWideRow,
  part: SetPart,
  column: CarTemplateNoteColumn,
): { text: string | null; column: CarTemplateNoteColumn } {
  const primaryText = readNoteText(template, column);
  if (primaryText || part !== 'trunk') {
    return { text: primaryText, column };
  }

  const fallbackColumn = TRUNK_NOTE_FALLBACKS[column];
  if (!fallbackColumn) {
    return { text: null, column };
  }

  const fallbackText = readNoteText(template, fallbackColumn);
  if (!fallbackText) {
    return { text: null, column };
  }

  return { text: fallbackText, column: fallbackColumn };
}

export function readNoteText(
  template: CarTemplateWideRow,
  column: CarTemplateNoteColumn,
): string | null {
  const value = template[column];
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
