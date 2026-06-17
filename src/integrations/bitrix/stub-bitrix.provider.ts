import { Injectable, NotImplementedException } from '@nestjs/common';
import { BitrixProvider } from './bitrix.provider';
import { BitrixDealPayload } from './bitrix.types';

@Injectable()
export class StubBitrixProvider extends BitrixProvider {
  async readDeal(_dealId: string): Promise<BitrixDealPayload> {
    throw new NotImplementedException('BitrixProvider stub');
  }
}
