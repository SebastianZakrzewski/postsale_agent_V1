import { SideEffectGuard } from '../../domains/side-effects/guards/side-effect.guard';
import { SideEffectNotRecordedError } from '../../domains/side-effects/errors/side-effect.errors';
import {
  CreateSideEffectRecordInput,
  SideEffectRecordRepository,
} from '../../domains/side-effects/repository/side-effect-record.repository';
import { SideEffectService } from '../../domains/side-effects/services/side-effect.service';
import { SideEffectRecordStatus, SideEffectType } from '../../lib/enums';
import { SideEffectRecordRow } from '../../lib/persistence';

class InMemorySideEffectRecordRepository extends SideEffectRecordRepository {
  private readonly records = new Map<string, SideEffectRecordRow>();

  async createPending(
    input: CreateSideEffectRecordInput,
  ): Promise<SideEffectRecordRow> {
    const row: SideEffectRecordRow = {
      id: `se-${this.records.size + 1}`,
      workflow_id: input.workflowId,
      side_effect_type: input.sideEffectType,
      idempotency_key: input.idempotencyKey,
      status: SideEffectRecordStatus.PENDING,
      retry_allowed: false,
      error_code: null,
      provider_response: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.records.set(input.idempotencyKey, row);
    return row;
  }

  async findByIdempotencyKey(key: string): Promise<SideEffectRecordRow | null> {
    return this.records.get(key) ?? null;
  }

  async updateStatus(
    id: string,
    status: SideEffectRecordStatus,
    errorCode?: string,
    retryAllowed?: boolean,
    providerResponse?: Record<string, unknown>,
  ): Promise<void> {
    for (const row of this.records.values()) {
      if (row.id === id) {
        row.status = status;
        row.error_code = errorCode ?? null;
        row.retry_allowed = retryAllowed ?? row.retry_allowed;
        row.provider_response = providerResponse ?? row.provider_response;
        row.updated_at = new Date().toISOString();
      }
    }
  }
}

describe('SideEffectService', () => {
  let service: SideEffectService;
  let repository: InMemorySideEffectRecordRepository;

  beforeEach(() => {
    repository = new InMemorySideEffectRecordRepository();
    service = new SideEffectService(repository);
  });

  it('record creates a PENDING side effect record', async () => {
    const record = await service.record({
      workflowId: 'wf-1',
      sideEffectType: SideEffectType.SEND_INITIAL_EMAIL,
      idempotencyKey: 'wf-1-SEND_INITIAL_EMAIL',
    });

    expect(record.status).toBe(SideEffectRecordStatus.PENDING);
    expect(record.sideEffectType).toBe(SideEffectType.SEND_INITIAL_EMAIL);
  });

  it('markFailed sets errorCode and retryAllowed', async () => {
    const record = await service.record({
      workflowId: 'wf-1',
      sideEffectType: SideEffectType.SEND_INITIAL_EMAIL,
      idempotencyKey: 'wf-1-email-fail',
    });

    await service.markFailed(record.id, 'EMAIL_TIMEOUT', true);

    const updated = await service.findByIdempotencyKey('wf-1-email-fail');
    expect(updated?.status).toBe(SideEffectRecordStatus.FAILED);
    expect(updated?.errorCode).toBe('EMAIL_TIMEOUT');
    expect(updated?.retryAllowed).toBe(true);
  });
});

describe('SideEffectGuard', () => {
  let guard: SideEffectGuard;
  let service: SideEffectService;

  beforeEach(() => {
    const repository = new InMemorySideEffectRecordRepository();
    service = new SideEffectService(repository);
    guard = new SideEffectGuard(service);
  });

  it('throws when no side effect record exists for key', async () => {
    await expect(
      guard.assertCanExecuteByKey('missing-key'),
    ).rejects.toBeInstanceOf(SideEffectNotRecordedError);
  });

  it('throws when side effect record is not PENDING', async () => {
    const record = await service.record({
      workflowId: 'wf-1',
      sideEffectType: SideEffectType.SEND_INITIAL_EMAIL,
      idempotencyKey: 'wf-1-done',
    });
    await service.markSucceeded(record.id);

    const succeeded = await service.findByIdempotencyKey('wf-1-done');
    expect(() => guard.assertCanExecute(succeeded!)).toThrow(
      SideEffectNotRecordedError,
    );
  });

  it('allows execution when record is PENDING', async () => {
    const record = await service.record({
      workflowId: 'wf-1',
      sideEffectType: SideEffectType.SEND_INITIAL_EMAIL,
      idempotencyKey: 'wf-1-pending',
    });

    expect(() => guard.assertCanExecute(record)).not.toThrow();
  });
});
