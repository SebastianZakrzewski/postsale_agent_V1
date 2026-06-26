import { Test, TestingModule } from '@nestjs/testing';
import { resolveBodyTypeProfile } from '../../domains/template-matching/config/body-type-compatibility';
import {
  readNoteText,
  readNoteTextForPart,
  resolveNoteColumnForPart,
} from '../../domains/template-matching/config/note-column-resolver';
import { CarTemplateRepository } from '../../domains/template-matching/repository/car-template.repository.port';
import { TemplateMatchingService } from '../../domains/template-matching/services/template-matching.service';
import { TemplateNoteSelectionService } from '../../domains/template-matching/services/template-note-selection.service';
import { CarTemplateWideRow } from '../../domains/template-matching/types';
import {
  buildAcuraMdxTemplate,
  InMemoryCarTemplateRepository,
} from '../helpers/in-memory-car-template.repository';

function buildMinimalTemplate(
  overrides: Partial<CarTemplateWideRow> = {},
): CarTemplateWideRow {
  return {
    id: 'template-minimal',
    brand: 'toyota',
    model: 'proace_city_verso_1_gen',
    generation: '2019-2028',
    body_type_1: 'van',
    body_type_2: null,
    body_type_3: null,
    notes_general: null,
    notes_front_classic: null,
    notes_front_3d: null,
    notes_rear_classic: null,
    notes_rear_3d: null,
    notes_third_row: null,
    notes_trunk_general: null,
    notes_trunk_estate: null,
    notes_trunk_hatchback: null,
    notes_trunk_sedan: null,
    notes_trunk_liftback: null,
    notes_trunk_suv_5_seater: null,
    notes_trunk_suv_7_seater: null,
    notes_trunk_minivan_5_seater: null,
    notes_trunk_minivan_7_seater: null,
    ...overrides,
  };
}

describe('Template mapping edge cases', () => {
  describe('Stage 1 — TemplateMatchingService', () => {
    let service: TemplateMatchingService;
    let repository: InMemoryCarTemplateRepository;

    beforeEach(async () => {
      repository = new InMemoryCarTemplateRepository();
      const moduleFixture: TestingModule = await Test.createTestingModule({
        providers: [
          TemplateMatchingService,
          { provide: CarTemplateRepository, useValue: repository },
        ],
      }).compile();
      service = moduleFixture.get(TemplateMatchingService);
    });

    it('escalates insufficient_vehicle_data when brand is empty', async () => {
      const result = await service.matchDealContext({
        bitrixDealId: '1',
        brand: '',
        model: 'MDX 2 gen',
        bodyType: 'SUV',
        generation: '2006-2013',
        product: '3D EVAPREMIUM Z RANTAMI',
      });
      expect(result).toEqual({
        status: 'NOT_FOUND',
        escalationReason: 'insufficient_vehicle_data',
      });
    });

    it('escalates insufficient_vehicle_data when body type is empty', async () => {
      const result = await service.matchDealContext({
        bitrixDealId: '1',
        brand: 'Toyota',
        model: 'ProAce',
        bodyType: '',
        generation: '2019-2028',
        product: '3D EVAPREMIUM Z RANTAMI',
      });
      expect(result).toEqual({
        status: 'NOT_FOUND',
        escalationReason: 'insufficient_vehicle_data',
      });
    });

    it('escalates template_not_found when vehicle key has no rows', async () => {
      const result = await service.matchDealContext({
        bitrixDealId: '1',
        brand: 'Seat',
        model: 'Altea XL',
        bodyType: 'Minivan',
        generation: '2006-2015',
        product: '3D EVAPREMIUM Z RANTAMI',
      });
      expect(result).toEqual({
        status: 'NOT_FOUND',
        escalationReason: 'template_not_found',
      });
    });

    it('escalates body_type_mismatch when generation matches but body does not', async () => {
      repository.seed(
        buildMinimalTemplate({
          body_type_1: 'suv_7_seater',
        }),
      );

      const result = await service.matchDealContext({
        bitrixDealId: '1',
        brand: 'Toyota',
        model: 'ProAce City Verso 1 gen',
        bodyType: 'Sedan',
        generation: '2019-2028',
        product: '3D EVAPREMIUM Z RANTAMI',
      });
      expect(result).toEqual({
        status: 'NOT_FOUND',
        escalationReason: 'body_type_mismatch',
      });
    });

    it('matches when compatible body type is only on body_type_3', async () => {
      repository.seed(
        buildMinimalTemplate({
          body_type_1: 'sedan',
          body_type_2: 'estate',
          body_type_3: 'van',
        }),
      );

      const result = await service.matchDealContext({
        bitrixDealId: '1',
        brand: 'Toyota',
        model: 'ProAce City Verso 1 gen',
        bodyType: 'Van dostawczy',
        generation: '2019-2028',
        product: '3D EVAPREMIUM Z RANTAMI',
      });
      expect(result.status).toBe('MATCHED');
    });

    it('matches van deal to legacy van_dseaterawczak template slug', async () => {
      repository.seed(
        buildMinimalTemplate({
          body_type_1: 'van_dseaterawczak',
        }),
      );

      const result = await service.matchDealContext({
        bitrixDealId: '1',
        brand: 'Toyota',
        model: 'ProAce City Verso 1 gen',
        bodyType: 'Van',
        generation: '2019-2028',
        product: '3D EVAPREMIUM Z RANTAMI',
      });
      expect(result.status).toBe('MATCHED');
    });

    it('matches generic SUV deal to suv_5_door template', async () => {
      repository.seed(
        buildMinimalTemplate({
          brand: 'skoda',
          model: 'kamiq_1_gen',
          body_type_1: 'suv_5_door',
        }),
      );

      const result = await service.matchDealContext({
        bitrixDealId: '1',
        brand: 'Skoda',
        model: 'Kamiq 1 gen',
        bodyType: 'SUV 5 drzwi',
        generation: '2019-2028',
        product: '3D EVAPREMIUM Z RANTAMI',
      });
      expect(result.status).toBe('MATCHED');
    });

    it('escalates ambiguous when three body-compatible templates share vehicle key', async () => {
      repository.seed(
        buildMinimalTemplate({ id: 'a', body_type_1: 'suv' }),
        buildMinimalTemplate({ id: 'b', body_type_1: 'suv_5_door' }),
        buildMinimalTemplate({ id: 'c', body_type_1: 'suv_5_seater' }),
      );

      const result = await service.matchDealContext({
        bitrixDealId: '1',
        brand: 'Toyota',
        model: 'ProAce City Verso 1 gen',
        bodyType: 'SUV',
        generation: '2019-2028',
        product: '3D EVAPREMIUM Z RANTAMI',
      });
      expect(result.status).toBe('AMBIGUOUS');
      if (result.status === 'AMBIGUOUS') {
        expect(result.candidateIds).toHaveLength(3);
      }
    });

    it('normalizes polish Kombi label to estate and matches estate template', async () => {
      repository.seed(
        buildMinimalTemplate({
          brand: 'volvo',
          model: 'v60_2_gen',
          body_type_1: 'estate',
        }),
      );

      const result = await service.matchDealContext({
        bitrixDealId: '1',
        brand: 'Volvo',
        model: 'V60 2 gen',
        bodyType: 'Kombi',
        generation: '2019-2028',
        product: '3D EVAPREMIUM Z RANTAMI',
      });
      expect(result.status).toBe('MATCHED');
    });

    it('does not match generation when en-dash is used instead of hyphen', async () => {
      repository.seed(
        buildAcuraMdxTemplate({
          generation: '2006-2013',
        }),
      );

      const result = await service.matchDealContext({
        bitrixDealId: '1',
        brand: 'Acura',
        model: 'MDX 2 gen',
        bodyType: 'SUV 7 osobowy',
        generation: ' 2006 – 2013 ',
        product: '3D EVAPREMIUM Z RANTAMI',
      });
      expect(result.status).toBe('NOT_FOUND');
      if (result.status === 'NOT_FOUND') {
        expect(result.escalationReason).toBe('template_not_found');
      }
    });

    it('matches generation with extra spaces and regular hyphen', async () => {
      repository.seed(
        buildAcuraMdxTemplate({
          generation: '2006-2013',
        }),
      );

      const result = await service.matchDealContext({
        bitrixDealId: '1',
        brand: 'Acura',
        model: 'MDX 2 gen',
        bodyType: 'SUV 7 osobowy',
        generation: ' 2006-2013 ',
        product: '3D EVAPREMIUM Z RANTAMI',
      });
      expect(result.status).toBe('MATCHED');
    });
  });

  describe('Stage 2 — TemplateNoteSelectionService', () => {
    let service: TemplateNoteSelectionService;

    beforeEach(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        providers: [TemplateNoteSelectionService],
      }).compile();
      service = moduleFixture.get(TemplateNoteSelectionService);
    });

    it('escalates unknown product line', () => {
      const result = service.selectNotes({
        carTemplate: buildAcuraMdxTemplate(),
        product: 'Nieznany produkt',
        productEnumId: '999',
        setVariantId: '276',
        resolvedBodyProfile: resolveBodyTypeProfile('suv_7_seater'),
      });
      expect(result).toEqual({
        notes: [],
        requiresEscalation: true,
        escalationReason: 'unknown_product_line',
      });
    });

    it('escalates unknown set variant id', () => {
      const result = service.selectNotes({
        carTemplate: buildAcuraMdxTemplate(),
        product: '3D EVAPREMIUM Z RANTAMI',
        productEnumId: '264',
        setVariantId: '9999',
        resolvedBodyProfile: resolveBodyTypeProfile('suv_7_seater'),
      });
      expect(result).toEqual({
        notes: [],
        requiresEscalation: true,
        escalationReason: 'requires_set_variant_escalation',
      });
    });

    it('escalates empty set variant id', () => {
      const result = service.selectNotes({
        carTemplate: buildAcuraMdxTemplate(),
        product: '3D EVAPREMIUM Z RANTAMI',
        setVariantId: '',
        resolvedBodyProfile: resolveBodyTypeProfile('suv_7_seater'),
      });
      expect(result.requiresEscalation).toBe(true);
      expect(result.escalationReason).toBe('requires_set_variant_escalation');
    });

    it('ignores whitespace-only note text', () => {
      const result = service.selectNotes({
        carTemplate: buildAcuraMdxTemplate({
          notes_front_3d: '   ',
          notes_rear_3d: 'Rear',
          notes_general: '\n\t',
        }),
        product: '3D EVAPREMIUM Z RANTAMI',
        setVariantId: '274',
        resolvedBodyProfile: resolveBodyTypeProfile('suv_7_seater'),
      });
      expect(result.requiresEscalation).toBe(false);
      expect(result.notes).toEqual([
        { part: 'rear', column: 'notes_rear_3d', text: 'Rear' },
      ]);
    });

    it('uses classic columns for classic product, not 3d columns', () => {
      const result = service.selectNotes({
        carTemplate: buildAcuraMdxTemplate({
          notes_front_3d: '3D front',
          notes_front_classic: 'Classic front',
          notes_rear_3d: null,
          notes_rear_classic: 'Classic rear',
          notes_general: null,
        }),
        product: 'Klasyczne EVAPREMIUM BEZ RANTÓW',
        productEnumId: '266',
        setVariantId: '274',
        resolvedBodyProfile: resolveBodyTypeProfile('suv_7_seater'),
      });
      expect(result.notes.map((n) => n.column)).toEqual([
        'notes_front_classic',
        'notes_rear_classic',
      ]);
    });

    it('maps van trunk to notes_trunk_general', () => {
      const template = buildMinimalTemplate({
        notes_trunk_general: 'Van trunk note',
      });
      const result = service.selectNotes({
        carTemplate: template,
        product: '3D EVAPREMIUM Z RANTAMI',
        setVariantId: '1250',
        resolvedBodyProfile: resolveBodyTypeProfile('van'),
      });
      expect(result.notes).toEqual([
        {
          part: 'trunk',
          column: 'notes_trunk_general',
          text: 'Van trunk note',
        },
      ]);
    });

    it('maps estate trunk to notes_trunk_estate', () => {
      const template = buildMinimalTemplate({
        body_type_1: 'estate',
        notes_trunk_estate: 'Estate boot note',
      });
      const result = service.selectNotes({
        carTemplate: template,
        product: '3D EVAPREMIUM Z RANTAMI',
        setVariantId: '1250',
        resolvedBodyProfile: resolveBodyTypeProfile('estate'),
      });
      expect(result.notes).toEqual([
        {
          part: 'trunk',
          column: 'notes_trunk_estate',
          text: 'Estate boot note',
        },
      ]);
    });

    it('selects third row only for variant 1260', () => {
      const result = service.selectNotes({
        carTemplate: buildAcuraMdxTemplate({
          notes_third_row: 'Third row note',
          notes_front_3d: 'Should not appear',
        }),
        product: '3D EVAPREMIUM Z RANTAMI',
        setVariantId: '1260',
        resolvedBodyProfile: resolveBodyTypeProfile('suv_7_seater'),
      });
      expect(result.notes).toEqual([
        {
          part: 'third_row',
          column: 'notes_third_row',
          text: 'Third row note',
        },
      ]);
    });

    it('does not fallback notes_trunk_general for suv_7_seater trunk column', () => {
      const result = service.selectNotes({
        carTemplate: buildAcuraMdxTemplate({
          notes_third_row: 'Row 3',
          notes_trunk_suv_7_seater: null,
          notes_trunk_general: 'General trunk',
        }),
        product: '3D EVAPREMIUM Z RANTAMI',
        setVariantId: '1072',
        resolvedBodyProfile: resolveBodyTypeProfile('suv_7_seater'),
      });
      expect(result.notes).toEqual([
        { part: 'third_row', column: 'notes_third_row', text: 'Row 3' },
      ]);
    });

    it('falls back to notes_trunk_general for suv_5_seater trunk column', () => {
      const result = service.selectNotes({
        carTemplate: buildMinimalTemplate({
          body_type_1: 'suv_5_door',
          notes_trunk_suv_5_seater: null,
          notes_trunk_general: 'General trunk',
        }),
        product: '3D EVAPREMIUM Z RANTAMI',
        setVariantId: '1072',
        resolvedBodyProfile: resolveBodyTypeProfile('suv_5_door'),
      });
      expect(result.notes).toEqual([
        {
          part: 'trunk',
          column: 'notes_trunk_general',
          text: 'General trunk',
        },
      ]);
    });

    it('falls back to notes_trunk_general for minivan variant 276 full set', () => {
      const result = service.selectNotes({
        carTemplate: buildMinimalTemplate({
          body_type_1: 'minivan',
          notes_front_classic: 'Front classic',
          notes_rear_classic: 'Rear classic',
          notes_trunk_minivan_5_seater: null,
          notes_trunk_general: 'Trunk general bagażnik',
        }),
        product: 'Klasyczne EVAPREMIUM BEZ RANTÓW',
        productEnumId: '266',
        setVariantId: '276',
        resolvedBodyProfile: resolveBodyTypeProfile('minivan'),
      });
      expect(result.notes).toEqual([
        {
          part: 'front',
          column: 'notes_front_classic',
          text: 'Front classic',
        },
        {
          part: 'rear',
          column: 'notes_rear_classic',
          text: 'Rear classic',
        },
        {
          part: 'trunk',
          column: 'notes_trunk_general',
          text: 'Trunk general bagażnik',
        },
      ]);
    });

    it('selects front and trunk without rear for variant 1332', () => {
      const result = service.selectNotes({
        carTemplate: buildAcuraMdxTemplate({
          notes_front_3d: 'Front',
          notes_rear_3d: 'Rear should not appear',
          notes_trunk_suv_7_seater: 'Trunk',
          notes_general: 'General',
        }),
        product: '3D EVAPREMIUM Z RANTAMI',
        setVariantId: '1332',
        resolvedBodyProfile: resolveBodyTypeProfile('suv_7_seater'),
      });
      expect(result.notes.map((n) => n.part)).toEqual([
        'front',
        'trunk',
        'general',
      ]);
    });

    it('does not apply suv_5 trunk fallback to suv_7_seater column', () => {
      const template = buildAcuraMdxTemplate({
        notes_trunk_suv_7_seater: null,
        notes_trunk_general: 'Should not be used for 7-seater',
      });
      const body = resolveBodyTypeProfile('suv_7_seater');
      const column = resolveNoteColumnForPart('trunk', '3d', body);
      const read = readNoteTextForPart(template, 'trunk', column);
      expect(column).toBe('notes_trunk_suv_7_seater');
      expect(read.text).toBeNull();
    });

    it('resolves product line from enum id when product string is empty', () => {
      const result = service.selectNotes({
        carTemplate: buildAcuraMdxTemplate(),
        product: '',
        productEnumId: '264',
        setVariantId: '270',
        resolvedBodyProfile: resolveBodyTypeProfile('suv_7_seater'),
      });
      expect(result.requiresEscalation).toBe(false);
      expect(result.notes[0]?.column).toBe('notes_front_3d');
    });
  });

  describe('note-column-resolver edge cases', () => {
    it('treats whitespace-only template values as empty', () => {
      const template = buildAcuraMdxTemplate({ notes_general: '  \n  ' });
      expect(readNoteText(template, 'notes_general')).toBeNull();
    });

    it('maps hatchback_5_door to hatchback trunk family', () => {
      const body = resolveBodyTypeProfile('hatchback_5_door');
      expect(resolveNoteColumnForPart('trunk', '3d', body)).toBe(
        'notes_trunk_hatchback',
      );
    });

    it('maps minivan 7-seater trunk column', () => {
      const body = resolveBodyTypeProfile('minivan_7_seater');
      expect(resolveNoteColumnForPart('trunk', '3d', body)).toBe(
        'notes_trunk_minivan_7_seater',
      );
    });
  });
});
