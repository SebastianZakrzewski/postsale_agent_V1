import { BitrixDealPayload } from './bitrix.types';
import { BitrixReadError } from './bitrix-read.error';
import { BitrixProvider } from './bitrix.provider';

export class MockBitrixProvider extends BitrixProvider {
  private readonly deals = new Map<string, BitrixDealPayload>();
  private readFailureMessage: string | null = null;

  setDeal(dealId: string, payload: BitrixDealPayload): void {
    this.deals.set(dealId, payload);
  }

  setReadFailure(message: string): void {
    this.readFailureMessage = message;
  }

  clearReadFailure(): void {
    this.readFailureMessage = null;
  }

  async readDeal(dealId: string): Promise<BitrixDealPayload> {
    if (this.readFailureMessage) {
      throw new BitrixReadError(dealId, this.readFailureMessage, false);
    }

    const payload = this.deals.get(dealId);
    if (!payload) {
      throw new BitrixReadError(
        dealId,
        'Deal not found in mock provider',
        false,
      );
    }
    return payload;
  }
}
