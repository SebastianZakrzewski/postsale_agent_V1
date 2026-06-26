import { Injectable, NotImplementedException } from '@nestjs/common';
import { BitrixProvider } from './bitrix.provider';
import { BitrixDealPayload } from './bitrix.types';

@Injectable()
export class StubBitrixProvider extends BitrixProvider {
  async readDeal(_dealId: string): Promise<BitrixDealPayload> {
    throw new NotImplementedException('BitrixProvider stub');
  }

  async readContactPrimaryEmail(_contactId: string): Promise<string | null> {
    throw new NotImplementedException('BitrixProvider stub');
  }

  async updateDealStage(_dealId: string, _stageId: string): Promise<void> {
    throw new NotImplementedException('BitrixProvider stub');
  }

  async addDealComment(_dealId: string, _comment: string): Promise<void> {
    throw new NotImplementedException('BitrixProvider stub');
  }
}
