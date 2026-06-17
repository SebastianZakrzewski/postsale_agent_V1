import { IdempotencyKeyRow } from '../../../lib/persistence';

export interface IdempotencyInsertResult {
  inserted: boolean;
  duplicate: boolean;
}

export abstract class IdempotencyRepository {
  abstract findByKey(key: string): Promise<IdempotencyKeyRow | null>;
  abstract tryInsert(
    key: string,
    scope: string,
    workflowId?: string,
  ): Promise<IdempotencyInsertResult>;
}

export const IDEMPOTENCY_REPOSITORY = Symbol('IDEMPOTENCY_REPOSITORY');
