import {
  DEFAULT_BITRIX_FIELD_MAPPING,
  parseBitrixFieldMappingFromEnv,
  resolveBitrixFieldMapping,
} from '../../domains/bitrix/config/bitrix-field-mapping';

describe('bitrix field mapping', () => {
  const originalEnv = process.env.BITRIX_DEAL_FIELD_MAP;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.BITRIX_DEAL_FIELD_MAP;
    } else {
      process.env.BITRIX_DEAL_FIELD_MAP = originalEnv;
    }
  });

  it('defaults to EVAPREMIUM confirmed field keys', () => {
    expect(DEFAULT_BITRIX_FIELD_MAPPING).toEqual({
      brand: 'UF_CRM_1760788285332',
      model: 'UF_CRM_1760788302371',
      bodyType: 'UF_CRM_1760788343011',
      generation: 'UF_CRM_1768256762509',
      product: 'UF_CRM_1781552572183',
    });
  });

  it('parses BITRIX_DEAL_FIELD_MAP JSON override', () => {
    const mapping = parseBitrixFieldMappingFromEnv(
      JSON.stringify({ brand: 'UF_CUSTOM_BRAND' }),
    );
    expect(mapping.brand).toBe('UF_CUSTOM_BRAND');
    expect(mapping.model).toBe(DEFAULT_BITRIX_FIELD_MAPPING.model);
  });

  it('resolveBitrixFieldMapping reads process.env', () => {
    process.env.BITRIX_DEAL_FIELD_MAP = JSON.stringify({
      product: 'UF_CUSTOM_PRODUCT',
    });
    expect(resolveBitrixFieldMapping().product).toBe('UF_CUSTOM_PRODUCT');
  });
});
