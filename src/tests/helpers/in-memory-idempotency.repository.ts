import {
  IdempotencyInsertResult,
  IdempotencyRepository,
} from '../../domains/idempotency/repository/idempotency.repository';
import { IdempotencyKeyRow } from '../../lib/persistence';

export class InMemoryIdempotencyRepository extends IdempotencyRepository {
  private readonly keys = new Map<string, IdempotencyKeyRow>();

  async findByKey(key: string): Promise<IdempotencyKeyRow | null> {
    return this.keys.get(key) ?? null;
  }

  async tryInsert(
    key: string,
    scope: string,
    workflowId?: string,
  ): Promise<IdempotencyInsertResult> {
    if (this.keys.has(key)) {
      return { inserted: false, duplicate: true };
    }
    this.keys.set(key, {
      id: `id-${key}`,
      idempotency_key: key,
      scope,
      workflow_id: workflowId ?? null,
      created_at: new Date().toISOString(),
    });
    return { inserted: true, duplicate: false };
  }

  async linkWorkflowId(key: string, workflowId: string): Promise<void> {
    const row = this.keys.get(key);
    if (!row) {
      throw new Error(`Idempotency key not found: ${key}`);
    }
    row.workflow_id = workflowId;
  }
}
