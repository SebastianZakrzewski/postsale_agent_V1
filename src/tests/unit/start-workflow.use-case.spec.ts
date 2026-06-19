import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../domains/audit/services/audit.service';
import { IdempotencyService } from '../../domains/idempotency/services/idempotency.service';
import { EscalateWorkflowUseCase } from '../../domains/postsale-workflows/use-cases/escalate-workflow.use-case';
import { FailWorkflowUseCase } from '../../domains/postsale-workflows/use-cases/fail-workflow.use-case';
import { LoadDealContextUseCase } from '../../domains/postsale-workflows/use-cases/load-deal-context.use-case';
import { MatchWorkflowTemplateUseCase } from '../../domains/postsale-workflows/use-cases/match-workflow-template.use-case';
import { StartWorkflowUseCase } from '../../domains/postsale-workflows/use-cases/start-workflow.use-case';
import { DuplicateStartWorkflowInProgressError } from '../../domains/postsale-workflows/errors/start-workflow.errors';
import { POSTSALE_WORKFLOW_REPOSITORY } from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import { TemplateMatchingModule } from '../../domains/template-matching/template-matching.module';
import { CAR_TEMPLATE_REPOSITORY } from '../../domains/template-matching/repository/car-template.repository';
import { BITRIX_PROVIDER } from '../../integrations/bitrix/bitrix.provider';
import { MockBitrixProvider } from '../../integrations/bitrix/mock-bitrix.provider';
import { DEFAULT_BITRIX_FIELD_MAPPING } from '../../domains/bitrix/config/bitrix-field-mapping';
import {
  TemplateMatchStatus,
  WorkflowEventType,
  WorkflowStatus,
} from '../../lib/enums';
import { InMemoryIdempotencyRepository } from '../helpers/in-memory-idempotency.repository';
import { InMemoryPostsaleWorkflowRepository } from '../helpers/in-memory-postsale-workflow.repository';
import { InMemoryCarTemplateRepository } from '../helpers/in-memory-template.repositories';
import { IDEMPOTENCY_REPOSITORY } from '../../domains/idempotency/repository/idempotency.repository';

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

describe('StartWorkflowUseCase', () => {
  let useCase: StartWorkflowUseCase;
  let workflowRepository: InMemoryPostsaleWorkflowRepository;
  let bitrixProvider: MockBitrixProvider;
  let auditService: { emit: jest.Mock };

  beforeEach(async () => {
    workflowRepository = new InMemoryPostsaleWorkflowRepository();
    bitrixProvider = new MockBitrixProvider();
    auditService = { emit: jest.fn().mockResolvedValue({}) };

    const carTemplateRepository = new InMemoryCarTemplateRepository();
    await carTemplateRepository.insertTemplate({
      importBatchId: 'batch-1',
      brand: 'bmw',
      model: 'x5',
      bodyType: 'suv',
      generation: 'g05',
      aliases: [],
      rawRowJson: {},
    });

    const idempotencyRepository = new InMemoryIdempotencyRepository();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TemplateMatchingModule],
      providers: [
        StartWorkflowUseCase,
        LoadDealContextUseCase,
        MatchWorkflowTemplateUseCase,
        EscalateWorkflowUseCase,
        FailWorkflowUseCase,
        IdempotencyService,
        {
          provide: IDEMPOTENCY_REPOSITORY,
          useValue: idempotencyRepository,
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
    })
      .overrideProvider(CAR_TEMPLATE_REPOSITORY)
      .useValue(carTemplateRepository)
      .compile();

    useCase = moduleFixture.get(StartWorkflowUseCase);
  });

  function seedDeal(dealId: string, fields: Record<string, string>) {
    bitrixProvider.setDeal(dealId, {
      id: dealId,
      fields,
    });
  }

  it('case 1: duplicate trigger does not create second workflow', async () => {
    seedDeal('deal-1', buildBitrixFields());

    const command = {
      bitrixDealId: 'deal-1',
      idempotencyKey: 'deal-1-start',
    };

    const first = await useCase.execute(command);
    const second = await useCase.execute(command);

    expect(first.isDuplicate).toBe(false);
    expect(second.isDuplicate).toBe(true);
    expect(second.workflowId).toBe(first.workflowId);
    expect(workflowRepository.count()).toBe(1);
  });

  it('throws when duplicate idempotency key has no linked workflow yet', async () => {
    const idempotencyRepository = new InMemoryIdempotencyRepository();
    await idempotencyRepository.tryInsert('deal-race-start', 'start_workflow');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TemplateMatchingModule],
      providers: [
        StartWorkflowUseCase,
        LoadDealContextUseCase,
        MatchWorkflowTemplateUseCase,
        EscalateWorkflowUseCase,
        FailWorkflowUseCase,
        IdempotencyService,
        {
          provide: IDEMPOTENCY_REPOSITORY,
          useValue: idempotencyRepository,
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
    })
      .overrideProvider(CAR_TEMPLATE_REPOSITORY)
      .useValue(new InMemoryCarTemplateRepository())
      .compile();

    const raceUseCase = moduleFixture.get(StartWorkflowUseCase);

    await expect(
      raceUseCase.execute({
        bitrixDealId: 'deal-race',
        idempotencyKey: 'deal-race-start',
      }),
    ).rejects.toThrow(DuplicateStartWorkflowInProgressError);

    expect(workflowRepository.count()).toBe(0);
  });

  it('marks workflow FAILED when Bitrix read fails', async () => {
    seedDeal('deal-bitrix-fail', buildBitrixFields());
    bitrixProvider.setReadFailure('HTTP 503');

    const result = await useCase.execute({
      bitrixDealId: 'deal-bitrix-fail',
      idempotencyKey: 'deal-bitrix-fail-start',
    });

    expect(result.status).toBe(WorkflowStatus.FAILED);
    expect(result.isDuplicate).toBe(false);
    expect(workflowRepository.count()).toBe(1);
    expect(auditService.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: WorkflowEventType.WORKFLOW_FAILED,
        statusAfter: WorkflowStatus.FAILED,
      }),
    );
  });

  it('case 2: NOT_FOUND escalates workflow', async () => {
    seedDeal(
      'deal-2',
      buildBitrixFields({
        [DEFAULT_BITRIX_FIELD_MAPPING.model]: 'UnknownModel',
      }),
    );

    const result = await useCase.execute({
      bitrixDealId: 'deal-2',
      idempotencyKey: 'deal-2-start',
    });

    expect(result.status).toBe(WorkflowStatus.ESCALATED);
    expect(result.templateMatchStatus).toBe(TemplateMatchStatus.NOT_FOUND);
    expect(result.isDuplicate).toBe(false);
  });

  it('case 2: insufficient Bitrix data escalates before template match', async () => {
    seedDeal('deal-2b', {
      [DEFAULT_BITRIX_FIELD_MAPPING.brand]: 'BMW',
    });

    const result = await useCase.execute({
      bitrixDealId: 'deal-2b',
      idempotencyKey: 'deal-2b-start',
    });

    expect(result.status).toBe(WorkflowStatus.ESCALATED);
    expect(result.templateMatchStatus).toBe(TemplateMatchStatus.NOT_FOUND);
  });

  it('case 3: AMBIGUOUS escalates workflow', async () => {
    const carTemplateRepository = new InMemoryCarTemplateRepository();
    await carTemplateRepository.insertTemplate({
      importBatchId: 'batch-1',
      brand: 'bmw',
      model: 'x5',
      bodyType: 'suv',
      generation: 'g05',
      aliases: [],
      rawRowJson: {},
    });
    await carTemplateRepository.insertTemplate({
      importBatchId: 'batch-1',
      brand: 'bmw',
      model: 'x5',
      bodyType: 'suv',
      generation: 'g05',
      aliases: [],
      rawRowJson: {},
    });

    seedDeal('deal-3', buildBitrixFields());

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TemplateMatchingModule],
      providers: [
        StartWorkflowUseCase,
        LoadDealContextUseCase,
        MatchWorkflowTemplateUseCase,
        EscalateWorkflowUseCase,
        FailWorkflowUseCase,
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
    })
      .overrideProvider(CAR_TEMPLATE_REPOSITORY)
      .useValue(carTemplateRepository)
      .compile();

    const ambiguousUseCase = moduleFixture.get(StartWorkflowUseCase);

    const result = await ambiguousUseCase.execute({
      bitrixDealId: 'deal-3',
      idempotencyKey: 'deal-3-start',
    });

    expect(result.status).toBe(WorkflowStatus.ESCALATED);
    expect(result.templateMatchStatus).toBe(TemplateMatchStatus.AMBIGUOUS);
  });

  it('happy path: matched template updates workflow status', async () => {
    seedDeal('deal-4', buildBitrixFields());

    const result = await useCase.execute({
      bitrixDealId: 'deal-4',
      idempotencyKey: 'deal-4-start',
    });

    expect(result.status).toBe(WorkflowStatus.TEMPLATE_MATCHED);
    expect(result.templateMatchStatus).toBe(TemplateMatchStatus.MATCHED);
    expect(result.isDuplicate).toBe(false);

    const persisted = await workflowRepository.findById(result.workflowId);
    expect(persisted?.dealContext).toMatchObject({ brand: 'BMW', model: 'X5' });
    expect(persisted?.carTemplateId).toBeTruthy();
    expect(persisted?.product).toBe('EVA Mat');
  });
});
