import { DEFAULT_BITRIX_FIELD_MAPPING } from '../../domains/bitrix/config/bitrix-field-mapping';

/** Representative Bitrix vehicle + product fields for tests (OD-004). */
export function buildBitrixDealFields(
  overrides: Record<string, string> = {},
): Record<string, string> {
  return {
    [DEFAULT_BITRIX_FIELD_MAPPING.brand]: 'BMW',
    [DEFAULT_BITRIX_FIELD_MAPPING.model]: 'X5',
    [DEFAULT_BITRIX_FIELD_MAPPING.bodyType]: 'SUV',
    [DEFAULT_BITRIX_FIELD_MAPPING.generation]: 'G05',
    [DEFAULT_BITRIX_FIELD_MAPPING.product]: '3D EVAPREMIUM Z RANTAMI',
    [DEFAULT_BITRIX_FIELD_MAPPING.productEnum]: '264',
    [DEFAULT_BITRIX_FIELD_MAPPING.setVariant]: '274',
    ...overrides,
  };
}
