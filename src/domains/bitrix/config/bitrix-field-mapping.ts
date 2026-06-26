/**
 * Bitrix deal custom field mapping for DealContext parsing (OD-004).
 * Confirmed against evapremium.bitrix24.pl via crm.deal.get on deal 33950 (2026-06-18).
 */
export interface BitrixFieldMapping {
  brand: string;
  model: string;
  bodyType: string;
  generation: string;
  product: string;
  productEnum: string;
  setVariant: string;
}

export const DEFAULT_BITRIX_FIELD_MAPPING: BitrixFieldMapping = {
  brand: 'UF_CRM_1760788285332',
  model: 'UF_CRM_1760788302371',
  bodyType: 'UF_CRM_1760788343011',
  generation: 'UF_CRM_1768256762509',
  product: 'UF_CRM_1781552572183',
  productEnum: 'UF_CRM_1757024835301',
  setVariant: 'UF_CRM_1757024931236',
};

export function parseBitrixFieldMappingFromEnv(
  raw: string | undefined,
): BitrixFieldMapping {
  if (!raw?.trim()) {
    return DEFAULT_BITRIX_FIELD_MAPPING;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<BitrixFieldMapping>;
    return {
      brand: parsed.brand ?? DEFAULT_BITRIX_FIELD_MAPPING.brand,
      model: parsed.model ?? DEFAULT_BITRIX_FIELD_MAPPING.model,
      bodyType: parsed.bodyType ?? DEFAULT_BITRIX_FIELD_MAPPING.bodyType,
      generation: parsed.generation ?? DEFAULT_BITRIX_FIELD_MAPPING.generation,
      product: parsed.product ?? DEFAULT_BITRIX_FIELD_MAPPING.product,
      productEnum:
        parsed.productEnum ?? DEFAULT_BITRIX_FIELD_MAPPING.productEnum,
      setVariant: parsed.setVariant ?? DEFAULT_BITRIX_FIELD_MAPPING.setVariant,
    };
  } catch {
    return DEFAULT_BITRIX_FIELD_MAPPING;
  }
}

export function resolveBitrixFieldMapping(): BitrixFieldMapping {
  return parseBitrixFieldMappingFromEnv(process.env.BITRIX_DEAL_FIELD_MAP);
}
