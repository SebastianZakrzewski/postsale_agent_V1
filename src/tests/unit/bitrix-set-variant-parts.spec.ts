import {
  BITRIX_SET_VARIANT_PARTS,
  resolveSetVariantParts,
} from '../../domains/template-matching/config/bitrix-set-variant-parts';

describe('bitrix-set-variant-parts', () => {
  it('covers all 15 Bitrix set variant enum IDs', () => {
    const expectedIds = [
      '270',
      '272',
      '274',
      '276',
      '1332',
      '1250',
      '1260',
      '1270',
      '1280',
      '1290',
      '1072',
      '1080',
      '1088',
      '1300',
      '1310',
    ];

    for (const id of expectedIds) {
      expect(
        BITRIX_SET_VARIANT_PARTS[id] !== undefined ||
          id === '1300' ||
          id === '1310',
      ).toBe(true);
    }
  });

  it('maps full set with trunk to front, rear, trunk, general', () => {
    expect(resolveSetVariantParts('276')).toEqual({
      parts: ['front', 'rear', 'trunk', 'general'],
      requiresSetVariantEscalation: false,
      escalateSingleMat: false,
    });
  });

  it('escalates single mat variants', () => {
    expect(resolveSetVariantParts('1300')).toEqual({
      parts: [],
      requiresSetVariantEscalation: false,
      escalateSingleMat: true,
    });
  });

  it('escalates missing set variant', () => {
    expect(resolveSetVariantParts(null)).toEqual({
      parts: [],
      requiresSetVariantEscalation: true,
      escalateSingleMat: false,
    });
  });
});
