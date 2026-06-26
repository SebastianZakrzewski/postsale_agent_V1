export interface DealContext {
  bitrixDealId: string;
  customerEmail: string;
  brand: string;
  model: string;
  bodyType: string;
  generation: string | null;
  product: string;
  productSource?: 'string' | 'enum_fallback';
  productEnumId?: string | null;
  setVariantId?: string | null;
  setVariantLabel?: string | null;
}

export type VehicleDealContext = Omit<DealContext, 'customerEmail'>;
