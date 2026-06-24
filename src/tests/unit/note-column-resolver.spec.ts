import {
  readNoteTextForPart,
  resolveNoteColumnForPart,
} from '../../domains/template-matching/config/note-column-resolver';
import { resolveBodyTypeProfile } from '../../domains/template-matching/config/body-type-compatibility';
import { CarTemplateWideRow } from '../../domains/template-matching/types';

describe('note-column-resolver', () => {
  it('maps 3D full set + suv_7_seater to expected note columns', () => {
    const body = resolveBodyTypeProfile('suv_7_seater');

    expect(resolveNoteColumnForPart('front', '3d', body)).toBe(
      'notes_front_3d',
    );
    expect(resolveNoteColumnForPart('rear', '3d', body)).toBe('notes_rear_3d');
    expect(resolveNoteColumnForPart('trunk', '3d', body)).toBe(
      'notes_trunk_suv_7_seater',
    );
    expect(resolveNoteColumnForPart('general', '3d', body)).toBe(
      'notes_general',
    );
  });

  it('maps classic front/rear columns', () => {
    const body = resolveBodyTypeProfile('sedan');
    expect(resolveNoteColumnForPart('front', 'classic', body)).toBe(
      'notes_front_classic',
    );
    expect(resolveNoteColumnForPart('rear', 'classic', body)).toBe(
      'notes_rear_classic',
    );
    expect(resolveNoteColumnForPart('trunk', 'classic', body)).toBe(
      'notes_trunk_sedan',
    );
  });

  it('maps suv_6_seater trunk to suv 7-seater column', () => {
    const body = resolveBodyTypeProfile('suv_6_seater');
    expect(resolveNoteColumnForPart('trunk', '3d', body)).toBe(
      'notes_trunk_suv_7_seater',
    );
  });

  it('falls back to notes_trunk_general when suv 5-seater trunk is empty', () => {
    const body = resolveBodyTypeProfile('suv_5_door');
    const template: CarTemplateWideRow = {
      id: 't1',
      brand: 'skoda',
      model: 'kamiq_1_gen',
      generation: '2018-2028',
      body_type_1: 'suv',
      body_type_2: null,
      body_type_3: null,
      notes_general: null,
      notes_front_classic: null,
      notes_front_3d: null,
      notes_rear_classic: null,
      notes_rear_3d: null,
      notes_third_row: null,
      notes_trunk_general: 'Poziom bagażnika górny czy dolny?',
      notes_trunk_estate: null,
      notes_trunk_hatchback: null,
      notes_trunk_sedan: null,
      notes_trunk_liftback: null,
      notes_trunk_suv_5_seater: null,
      notes_trunk_suv_7_seater: null,
      notes_trunk_minivan_5_seater: null,
      notes_trunk_minivan_7_seater: null,
    };

    const column = resolveNoteColumnForPart('trunk', '3d', body);
    expect(column).toBe('notes_trunk_suv_5_seater');

    const result = readNoteTextForPart(template, 'trunk', column);
    expect(result.column).toBe('notes_trunk_general');
    expect(result.text).toBe('Poziom bagażnika górny czy dolny?');
  });
});
