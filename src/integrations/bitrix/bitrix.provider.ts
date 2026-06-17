import { BitrixDealPayload } from './bitrix.types';

export abstract class BitrixProvider {
  abstract readDeal(dealId: string): Promise<BitrixDealPayload>;
}

export const BITRIX_PROVIDER = Symbol('BITRIX_PROVIDER');
