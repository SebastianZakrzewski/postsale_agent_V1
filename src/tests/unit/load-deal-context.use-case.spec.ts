import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../domains/audit/services/audit.service';
import { IdempotencyService } from '../../domains/idempotency/services/idempotency.service';
import { LoadDealContextUseCase } from '../../domains/postsale-workflows/use-cases/load-deal-context.use-case';
import { DEFAULT_BITRIX_FIELD_MAPPING } from '../../domains/bitrix/config/bitrix-field-mapping';
import { POSTSALE_WORKFLOW_REPOSITORY } from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import { BITRIX_PROVIDER } from '../../integrations/bitrix/bitrix.provider';
import { MockBitrixProvider } from '../../integrations/bitrix/mock-bitrix.provider';
import { WorkflowEventType, WorkflowStatus } from '../../lib/enums';
import { IDEMPOTENCY_REPOSITORY } from '../../domains/idempotency/repository/idempotency.repository';
import { InMemoryIdempotencyRepository } from '../helpers/in-memory-idempotency.repository';
import { InMemoryPostsaleWorkflowRepository } from '../helpers/in-memory-postsale-workflow.repository';

function buildBitrixFields(overrides: Record<string, string> = {}) {
  return {
    [DEFAULT_BITRIX_FIELD_MAPPING.brand]: 'BMW',
    [DEFAULT_BITRIX_FIELD_MAPPING.model]: 'X5',
    [DEFAULT_BITRIX_FIELD_MAPPING.bodyType]: 'SUV',
    [DEFAULT_BITRIX_FIELD_MAPPING.product]: 'EVA Mat',
    [DEFAULT_BITRIX_FIELD_MAPPING.generation]: 'G05',
    ...overrides,
  };
}

describe('LoadDealContextUseCase', () => {
  let useCase: LoadDealContextUseCase;
  let workflowRepository: InMemoryPostsaleWorkflowRepository;
  let bitrixProvider: MockBitrixProvider;
  let auditService: { emit: jest.Mock };

  beforeEach(async () => {
    workflowRepository = new InMemoryPostsaleWorkflowRepository();
    bitrixProvider = new MockBitrixProvider();
    auditService = { emit: jest.fn().mockResolvedValue({}) };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        LoadDealContextUseCase,
        IdempotencyService,
        {
          provide: IDEMPOTENCY_REPOSITORY,
          useValue: new InMemoryIdempotencyRepository(),
        },
        {
          provide: POSTSALE_WORKFLOW_REPOSITORY,
          useValue: workflowRepository,
        },
        {
          provide: BITRIX_PROVIDER,
          useValue: bitrixProvider,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    }).compile();

    useCase = moduleFixture.get(LoadDealContextUseCase);
  });

  it('persists deal context and sets CONTEXT_LOADED', async () => {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-load-1',
      status: WorkflowStatus.STARTED,
    });

    bitrixProvider.setDeal('deal-load-1', {
      id: 'deal-load-1',
      fields: buildBitrixFields(),
    });

    const outcome = await useCase.execute({
      workflowId: workflow.id,
      bitrixDealId: 'deal-load-1',
    });

    expect(outcome.type).toBe('success');
    if (outcome.type !== 'success') {
      return;
    }

    expect(outcome.workflow.status).toBe(WorkflowStatus.CONTEXT_LOADED);
    expect(outcome.workflow.dealContext).toMatchObject({
      bitrixDealId: 'deal-load-1',
      brand: 'BMW',
      model: 'X5',
    });
    expect(outcome.workflow.product).toBe('EVA Mat');
    expect(auditService.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: WorkflowEventType.DEAL_CONTEXT_LOADED,
        statusAfter: WorkflowStatus.CONTEXT_LOADED,
      }),
    );
  });

  it('does not call Bitrix again when context is already loaded', async () => {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-load-2',
      status: WorkflowStatus.STARTED,
    });

    bitrixProvider.setDeal('deal-load-2', {
      id: 'deal-load-2',
      fields: buildBitrixFields(),
    });

    const readSpy = jest.spyOn(bitrixProvider, 'readDeal');

    await useCase.execute({
      workflowId: workflow.id,
      bitrixDealId: 'deal-load-2',
    });

    readSpy.mockClear();

    const retry = await useCase.execute({
      workflowId: workflow.id,
      bitrixDealId: 'deal-load-2',
    });

    expect(retry.type).toBe('already_loaded');
    expect(readSpy).not.toHaveBeenCalled();
  });

  it('returns parse_failed without escalating internally', async () => {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-load-3',
      status: WorkflowStatus.STARTED,
    });

    bitrixProvider.setDeal('deal-load-3', {
      id: 'deal-load-3',
      fields: {
        [DEFAULT_BITRIX_FIELD_MAPPING.brand]: 'BMW',
      },
    });

    const outcome = await useCase.execute({
      workflowId: workflow.id,
      bitrixDealId: 'deal-load-3',
    });

    expect(outcome.type).toBe('parse_failed');
    expect(auditService.emit).not.toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: WorkflowEventType.DEAL_CONTEXT_LOADED,
      }),
    );
  });

  it('allows retry after parse_failed without idempotency blocking', async () => {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-load-retry',
      status: WorkflowStatus.STARTED,
    });

    bitrixProvider.setDeal('deal-load-retry', {
      id: 'deal-load-retry',
      fields: {
        [DEFAULT_BITRIX_FIELD_MAPPING.brand]: 'BMW',
      },
    });

    const failed = await useCase.execute({
      workflowId: workflow.id,
      bitrixDealId: 'deal-load-retry',
    });
    expect(failed.type).toBe('parse_failed');

    bitrixProvider.setDeal('deal-load-retry', {
      id: 'deal-load-retry',
      fields: buildBitrixFields(),
    });

    const retry = await useCase.execute({
      workflowId: workflow.id,
      bitrixDealId: 'deal-load-retry',
    });

    expect(retry.type).toBe('success');
  });
});
