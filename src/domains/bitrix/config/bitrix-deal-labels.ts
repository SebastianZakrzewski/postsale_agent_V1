/** Bitrix enum UF_CRM_1757024835301 */
export const BITRIX_PRODUCT_ENUM_LABELS: Readonly<Record<string, string>> = {
  '264': '3D EVAPREMIUM Z RANTAMI',
  '266': 'Klasyczne EVAPREMIUM BEZ RANTÓW',
  '268': 'Niestandardowy',
};

/** Bitrix enum UF_CRM_1757024931236 */
export const BITRIX_SET_VARIANT_LABELS: Readonly<Record<string, string>> = {
  '270': 'Przód',
  '272': 'Tył',
  '274': 'Przód + Tył',
  '276': 'Przód + Tył + Bagażnik',
  '1072': '3 Rzedy + Duży Bagażnik',
  '1080': '3 Rzedy + Mały Bagażnik',
  '1088': '3 Rzedy + Mały i Duży Bagażnik',
  '1250': 'Mata Do Bagażnika',
  '1260': '1 Rzad',
  '1270': '3 Rzad',
  '1280': '3 Rzedy',
  '1290': '2 Rzedy',
  '1300': 'Dywanik Kierowcy',
  '1310': 'Dywanik Pasażera',
  '1332': 'Przód + Bagażnik',
};

export interface ResolveBitrixProductLabelResult {
  label: string;
  source: 'string' | 'enum_fallback';
}

export function resolveBitrixProductLabelFromFields(input: {
  productString: string | null;
  productEnumId: string | null;
}): ResolveBitrixProductLabelResult | null {
  if (input.productString && input.productString.trim().length > 0) {
    return { label: input.productString.trim(), source: 'string' };
  }

  if (input.productEnumId && BITRIX_PRODUCT_ENUM_LABELS[input.productEnumId]) {
    return {
      label: BITRIX_PRODUCT_ENUM_LABELS[input.productEnumId],
      source: 'enum_fallback',
    };
  }

  return null;
}
