import { BitrixDealPayload } from './bitrix.types';

export abstract class BitrixProvider {
  abstract readDeal(dealId: string): Promise<BitrixDealPayload>;

  abstract readContactPrimaryEmail(contactId: string): Promise<string | null>;

  abstract updateDealStage(dealId: string, stageId: string): Promise<void>;

  abstract addDealComment(dealId: string, comment: string): Promise<void>;
}

export const BITRIX_PROVIDER = Symbol('BITRIX_PROVIDER');
