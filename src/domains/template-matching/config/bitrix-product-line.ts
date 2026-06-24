import { BITRIX_PRODUCT_ENUM_LABELS } from '../../bitrix/config/bitrix-deal-labels';
import { ResolvedProductLineResult } from '../types';

const PRODUCT_LINE_3D_LABEL = '3D EVAPREMIUM Z RANTAMI';
const PRODUCT_LINE_CLASSIC_LABEL = 'Klasyczne EVAPREMIUM BEZ RANTÓW';
const PRODUCT_LINE_CUSTOM_LABEL = 'Niestandardowy';

function normalizeProductLabel(label: string): string {
  return label.trim().toUpperCase();
}

export function resolveProductLine(input: {
  product: string;
  productEnumId?: string | null;
}): ResolvedProductLineResult {
  const productLabel = normalizeProductLabel(input.product);

  if (
    productLabel === normalizeProductLabel(PRODUCT_LINE_CUSTOM_LABEL) ||
    input.productEnumId === '268'
  ) {
    return {
      line: null,
      requiresCustomProductEscalation: true,
    };
  }

  if (
    productLabel === normalizeProductLabel(PRODUCT_LINE_3D_LABEL) ||
    input.productEnumId === '264'
  ) {
    return { line: '3d' };
  }

  if (
    productLabel === normalizeProductLabel(PRODUCT_LINE_CLASSIC_LABEL) ||
    input.productEnumId === '266'
  ) {
    return { line: 'classic' };
  }

  if (input.productEnumId && BITRIX_PRODUCT_ENUM_LABELS[input.productEnumId]) {
    const enumLabel = normalizeProductLabel(
      BITRIX_PRODUCT_ENUM_LABELS[input.productEnumId],
    );
    if (enumLabel === normalizeProductLabel(PRODUCT_LINE_3D_LABEL)) {
      return { line: '3d' };
    }
    if (enumLabel === normalizeProductLabel(PRODUCT_LINE_CLASSIC_LABEL)) {
      return { line: 'classic' };
    }
    if (enumLabel === normalizeProductLabel(PRODUCT_LINE_CUSTOM_LABEL)) {
      return {
        line: null,
        requiresCustomProductEscalation: true,
      };
    }
  }

  return {
    line: null,
    unknownProduct: true,
  };
}
