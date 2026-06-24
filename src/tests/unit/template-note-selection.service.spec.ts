import { Test, TestingModule } from '@nestjs/testing';
import { TemplateNoteSelectionService } from '../../domains/template-matching/services/template-note-selection.service';
import { resolveBodyTypeProfile } from '../../domains/template-matching/config/body-type-compatibility';
import { buildAcuraMdxTemplate } from '../helpers/in-memory-car-template.repository';

describe('TemplateNoteSelectionService', () => {
  let service: TemplateNoteSelectionService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [TemplateNoteSelectionService],
    }).compile();

    service = moduleFixture.get(TemplateNoteSelectionService);
  });

  it('selects notes for 3D full set variant 276', () => {
    const result = service.selectNotes({
      carTemplate: buildAcuraMdxTemplate(),
      product: '3D EVAPREMIUM Z RANTAMI',
      productEnumId: '264',
      setVariantId: '276',
      resolvedBodyProfile: resolveBodyTypeProfile('suv_7_seater'),
    });

    expect(result.requiresEscalation).toBe(false);
    expect(result.notes.map((note) => note.column)).toEqual([
      'notes_front_3d',
      'notes_rear_3d',
      'notes_trunk_suv_7_seater',
      'notes_general',
    ]);
  });

  it('escalates custom product', () => {
    const result = service.selectNotes({
      carTemplate: buildAcuraMdxTemplate(),
      product: 'Niestandardowy',
      productEnumId: '268',
      setVariantId: '276',
      resolvedBodyProfile: resolveBodyTypeProfile('suv_7_seater'),
    });

    expect(result.requiresEscalation).toBe(true);
    expect(result.escalationReason).toBe('requires_custom_product_escalation');
  });

  it('escalates single mat variant', () => {
    const result = service.selectNotes({
      carTemplate: buildAcuraMdxTemplate(),
      product: '3D EVAPREMIUM Z RANTAMI',
      setVariantId: '1300',
      resolvedBodyProfile: resolveBodyTypeProfile('suv_7_seater'),
    });

    expect(result.requiresEscalation).toBe(true);
    expect(result.escalationReason).toBe('single_mat_variant_escalation');
  });

  it('succeeds with partial notes when some columns are empty', () => {
    const result = service.selectNotes({
      carTemplate: buildAcuraMdxTemplate({
        notes_front_3d: null,
        notes_rear_3d: null,
        notes_general: null,
      }),
      product: '3D EVAPREMIUM Z RANTAMI',
      setVariantId: '274',
      resolvedBodyProfile: resolveBodyTypeProfile('suv_7_seater'),
    });

    expect(result.requiresEscalation).toBe(false);
    expect(result.notes).toEqual([]);
  });

  it('returns only non-empty note columns for the set variant', () => {
    const result = service.selectNotes({
      carTemplate: buildAcuraMdxTemplate({
        notes_front_3d: null,
        notes_rear_3d: 'Rear only',
        notes_general: null,
      }),
      product: '3D EVAPREMIUM Z RANTAMI',
      setVariantId: '272',
      resolvedBodyProfile: resolveBodyTypeProfile('suv_7_seater'),
    });

    expect(result.requiresEscalation).toBe(false);
    expect(result.notes).toEqual([
      {
        part: 'rear',
        column: 'notes_rear_3d',
        text: 'Rear only',
      },
    ]);
  });
});
