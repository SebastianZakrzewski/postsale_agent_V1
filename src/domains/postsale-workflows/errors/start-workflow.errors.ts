export class DuplicateStartWorkflowInProgressError extends Error {
  constructor(idempotencyKey: string) {
    super(
      `Start workflow already in progress for idempotency key: ${idempotencyKey}`,
    );
    this.name = 'DuplicateStartWorkflowInProgressError';
  }
}
