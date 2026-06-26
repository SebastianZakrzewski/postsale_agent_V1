export class DuplicateCustomerMessageError extends Error {
  constructor(public readonly externalMessageId: string) {
    super(`Duplicate customer message: ${externalMessageId}`);
    this.name = 'DuplicateCustomerMessageError';
  }
}
