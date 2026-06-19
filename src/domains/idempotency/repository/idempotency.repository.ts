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
  abstract linkWorkflowId(key: string, workflowId: string): Promise<void>;
}

export const IDEMPOTENCY_REPOSITORY = Symbol('IDEMPOTENCY_REPOSITORY');
