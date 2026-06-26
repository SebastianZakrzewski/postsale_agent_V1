import { BitrixDealPayload } from './bitrix.types';
import { BitrixDealFileUpload } from '../../domains/bitrix/services/bitrix-deal-file-field.builder';

export abstract class BitrixProvider {
  abstract readDeal(dealId: string): Promise<BitrixDealPayload>;

  abstract readContactPrimaryEmail(contactId: string): Promise<string | null>;

  abstract updateDealStage(dealId: string, stageId: string): Promise<void>;

  abstract addDealComment(dealId: string, comment: string): Promise<void>;

  abstract uploadDealFloorPhotos(
    dealId: string,
    fieldName: string,
    uploads: BitrixDealFileUpload[],
  ): Promise<void>;
}

export const BITRIX_PROVIDER = Symbol('BITRIX_PROVIDER');
