export class SideEffectNotRecordedError extends Error {
  constructor(message = 'Side effect cannot execute without a pending record') {
    super(message);
    this.name = 'SideEffectNotRecordedError';
  }
}
