import { DEFAULT_BITRIX_FIELD_MAPPING } from '../../domains/bitrix/config/bitrix-field-mapping';
import { parseBitrixDeal } from '../../domains/bitrix/parsers/bitrix-deal.parser';
import { BitrixDealPayload } from '../../integrations/bitrix/bitrix.types';
import { buildBitrixDealFields } from '../helpers/bitrix-deal-fields';

function buildPayload(fields: Record<string, unknown>): BitrixDealPayload {
  return {
    id: 'deal-100',
    stageId: 'NEW',
    fields,
  };
}

describe('parseBitrixDeal', () => {
  it('returns DealContext when required fields are present', () => {
    const result = parseBitrixDeal(
      buildPayload(buildBitrixDealFields()),
      DEFAULT_BITRIX_FIELD_MAPPING,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.dealContext).toMatchObject({
        bitrixDealId: 'deal-100',
        brand: 'BMW',
        model: 'X5',
        bodyType: 'SUV',
        generation: 'G05',
        product: '3D EVAPREMIUM Z RANTAMI',
        productSource: 'string',
        setVariantId: '274',
        setVariantLabel: 'Przód + Tył',
      });
    }
  });

  it('returns insufficient_vehicle_data when required fields are missing', () => {
    const result = parseBitrixDeal(
      buildPayload({
        [DEFAULT_BITRIX_FIELD_MAPPING.brand]: 'BMW',
      }),
      DEFAULT_BITRIX_FIELD_MAPPING,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('insufficient_vehicle_data');
      expect(result.missingFields).toEqual(
        expect.arrayContaining(['model', 'bodyType', 'product']),
      );
    }
  });

  it('allows null generation when other required fields are present', () => {
    const result = parseBitrixDeal(
      buildPayload(
        buildBitrixDealFields({
          [DEFAULT_BITRIX_FIELD_MAPPING.generation]: '',
        }),
      ),
      DEFAULT_BITRIX_FIELD_MAPPING,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.dealContext.generation).toBeNull();
    }
  });
});
