import {
  IdempotencyInsertResult,
  IdempotencyRepository,
} from '../../domains/idempotency/repository/idempotency.repository';
import { IdempotencyService } from '../../domains/idempotency/services/idempotency.service';
import { IdempotencyKeyRow } from '../../lib/persistence';

class ConcurrentIdempotencyRepository extends IdempotencyRepository {
  private readonly keys = new Map<string, IdempotencyKeyRow>();
  private insertCount = 0;

  async findByKey(key: string): Promise<IdempotencyKeyRow | null> {
    return this.keys.get(key) ?? null;
  }

  async tryInsert(
    key: string,
    scope: string,
    workflowId?: string,
  ): Promise<IdempotencyInsertResult> {
    this.insertCount += 1;
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

  getInsertCount(): number {
    return this.insertCount;
  }
}

describe('Idempotency concurrent insert', () => {
  it('handles race where only one insert wins for the same key', async () => {
    const repository = new ConcurrentIdempotencyRepository();
    const service = new IdempotencyService(repository);
    const command = { idempotencyKey: 'race-key', scope: 'start_workflow' };

    const [first, second] = await Promise.all([
      service.checkAndRecord(command),
      service.checkAndRecord(command),
    ]);

    const duplicates = [first, second].filter((r) => r.isDuplicate);
    const fresh = [first, second].filter((r) => !r.isDuplicate);

    expect(fresh).toHaveLength(1);
    expect(duplicates).toHaveLength(1);
    expect(repository.getInsertCount()).toBe(2);
  });
});
