import { BitrixFieldMapping } from '../config/bitrix-field-mapping';
import {
  BITRIX_SET_VARIANT_LABELS,
  resolveBitrixProductLabelFromFields,
} from '../config/bitrix-deal-labels';
import { BitrixDealPayload } from '../../../integrations/bitrix/bitrix.types';
import { VehicleDealContext } from '../../../lib/domain';

export interface BitrixDealParseFailure {
  ok: false;
  reason: 'insufficient_vehicle_data';
  missingFields: string[];
}

export type BitrixDealParseResult =
  | { ok: true; dealContext: VehicleDealContext }
  | BitrixDealParseFailure;

function readField(
  fields: Record<string, unknown> | undefined,
  key: string,
): string | null {
  if (!fields) {
    return null;
  }

  const value = fields[key];
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

export function parseBitrixDeal(
  payload: BitrixDealPayload,
  mapping: BitrixFieldMapping,
): BitrixDealParseResult {
  const fields = payload.fields;
  const brand = readField(fields, mapping.brand);
  const model = readField(fields, mapping.model);
  const bodyType = readField(fields, mapping.bodyType);
  const generation = readField(fields, mapping.generation);
  const productString = readField(fields, mapping.product);
  const productEnumId = readField(fields, mapping.productEnum);
  const setVariantId = readField(fields, mapping.setVariant);

  const missingFields: string[] = [];
  if (!brand) {
    missingFields.push('brand');
  }
  if (!model) {
    missingFields.push('model');
  }
  if (!bodyType) {
    missingFields.push('bodyType');
  }

  const productLabelResult = resolveBitrixProductLabelFromFields({
    productString,
    productEnumId,
  });
  if (!productLabelResult) {
    missingFields.push('product');
  }

  if (missingFields.length > 0) {
    return {
      ok: false,
      reason: 'insufficient_vehicle_data',
      missingFields,
    };
  }

  return {
    ok: true,
    dealContext: {
      bitrixDealId: payload.id,
      brand: brand!,
      model: model!,
      bodyType: bodyType!,
      generation,
      product: productLabelResult!.label,
      productSource: productLabelResult!.source,
      productEnumId,
      setVariantId,
      setVariantLabel: setVariantId
        ? (BITRIX_SET_VARIANT_LABELS[setVariantId] ?? null)
        : null,
    },
  };
}
