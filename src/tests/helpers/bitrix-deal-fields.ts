import { DEFAULT_BITRIX_FIELD_MAPPING } from '../../domains/bitrix/config/bitrix-field-mapping';
import { DealContext } from '../../lib/domain';

export const DEFAULT_MOCK_BITRIX_CONTACT_ID = 'contact-1';
export const DEFAULT_MOCK_CUSTOMER_EMAIL = 'customer@example.com';

/** Representative Bitrix vehicle + product fields for tests (OD-004). */
export function buildBitrixDealFields(
  overrides: Record<string, string> = {},
): Record<string, string> {
  return {
    CONTACT_ID: DEFAULT_MOCK_BITRIX_CONTACT_ID,
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

export function buildPersistedDealContext(
  bitrixDealId: string,
  overrides: Partial<DealContext> = {},
): DealContext {
  return {
    bitrixDealId,
    customerEmail: DEFAULT_MOCK_CUSTOMER_EMAIL,
    brand: 'BMW',
    model: 'X5',
    bodyType: 'SUV',
    generation: 'G05',
    product: '3D EVAPREMIUM Z RANTAMI',
    ...overrides,
  };
}

export function seedMockBitrixDeal(
  provider: {
    setDeal: (
      dealId: string,
      payload: { id: string; fields: Record<string, string> },
    ) => void;
    setContactEmail: (contactId: string, email: string) => void;
  },
  dealId: string,
  fields: Record<string, string> = buildBitrixDealFields(),
  contactEmail: string = DEFAULT_MOCK_CUSTOMER_EMAIL,
): void {
  provider.setDeal(dealId, { id: dealId, fields });
  const contactId = fields.CONTACT_ID ?? DEFAULT_MOCK_BITRIX_CONTACT_ID;
  provider.setContactEmail(contactId, contactEmail);
}
