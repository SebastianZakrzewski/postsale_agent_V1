export interface DealContext {
  bitrixDealId: string;
  brand: string;
  model: string;
  bodyType: string;
  generation: string | null;
  product: string;
  productSource?: 'string' | 'enum_fallback';
  setVariantId?: string | null;
  setVariantLabel?: string | null;
}
