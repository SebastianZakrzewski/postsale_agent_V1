import {
  IdempotencyInsertResult,
  IdempotencyRepository,
} from '../../domains/idempotency/repository/idempotency.repository';
import { IdempotencyService } from '../../domains/idempotency/services/idempotency.service';
import { IdempotencyKeyRow } from '../../lib/persistence';

class InMemoryIdempotencyRepository extends IdempotencyRepository {
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
}

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let repository: InMemoryIdempotencyRepository;

  beforeEach(() => {
    repository = new InMemoryIdempotencyRepository();
    service = new IdempotencyService(repository);
  });

  it('returns isDuplicate false on first checkAndRecord', async () => {
    const result = await service.checkAndRecord({
      idempotencyKey: 'deal-1-start',
      scope: 'start_workflow',
    });

    expect(result.isDuplicate).toBe(false);
    expect(result.key).toBe('deal-1-start');
    expect(result.scope).toBe('start_workflow');
  });

  it('returns isDuplicate true when idempotency key already recorded', async () => {
    await service.checkAndRecord({
      idempotencyKey: 'deal-1-start',
      scope: 'start_workflow',
    });

    const result = await service.checkAndRecord({
      idempotencyKey: 'deal-1-start',
      scope: 'start_workflow',
    });

    expect(result.isDuplicate).toBe(true);
  });

  it('associates workflowId when provided on first record', async () => {
    const result = await service.checkAndRecord(
      { idempotencyKey: 'deal-2-start', scope: 'start_workflow' },
      'workflow-uuid-1',
    );

    expect(result.isDuplicate).toBe(false);
    expect(result.workflowId).toBe('workflow-uuid-1');
  });
});
