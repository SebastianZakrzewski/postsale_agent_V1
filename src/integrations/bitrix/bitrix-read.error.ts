export class BitrixReadError extends Error {
  constructor(
    dealId: string,
    message: string,
    readonly retryable: boolean,
  ) {
    super(`Bitrix read failed for deal ${dealId}: ${message}`);
    this.name = 'BitrixReadError';
  }
}
