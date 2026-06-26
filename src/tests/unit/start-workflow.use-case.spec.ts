import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../domains/audit/services/audit.service';
import { EmitWorkflowEventUseCase } from '../../domains/audit/use-cases/emit-workflow-event.use-case';
import { IdempotencyService } from '../../domains/idempotency/services/idempotency.service';
import { CheckIdempotencyUseCase } from '../../domains/idempotency/use-cases/check-idempotency.use-case';
import { EscalateWorkflowUseCase } from '../../domains/postsale-workflows/use-cases/escalate-workflow.use-case';
import { FailWorkflowUseCase } from '../../domains/postsale-workflows/use-cases/fail-workflow.use-case';
import { LoadDealContextUseCase } from '../../domains/postsale-workflows/use-cases/load-deal-context.use-case';
import { MatchWorkflowTemplateUseCase } from '../../domains/postsale-workflows/use-cases/match-workflow-template.use-case';
import { StartWorkflowUseCase } from '../../domains/postsale-workflows/use-cases/start-workflow.use-case';
import { DuplicateStartWorkflowInProgressError } from '../../domains/postsale-workflows/errors/start-workflow.errors';
import { POSTSALE_WORKFLOW_REPOSITORY } from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import { CarTemplateRepository } from '../../domains/template-matching/repository/car-template.repository.port';
import { TemplateMatchingService } from '../../domains/template-matching/services/template-matching.service';
import { TemplateNoteSelectionService } from '../../domains/template-matching/services/template-note-selection.service';
import { BITRIX_PROVIDER } from '../../integrations/bitrix/bitrix.provider';
import { MockBitrixProvider } from '../../integrations/bitrix/mock-bitrix.provider';
import { DEFAULT_BITRIX_FIELD_MAPPING } from '../../domains/bitrix/config/bitrix-field-mapping';
import {
  TemplateMatchStatus,
  WorkflowEventType,
  WorkflowStatus,
} from '../../lib/enums';
import { InMemoryIdempotencyRepository } from '../helpers/in-memory-idempotency.repository';
import { InMemoryCarTemplateRepository } from '../helpers/in-memory-car-template.repository';
import { InMemoryPostsaleWorkflowRepository } from '../helpers/in-memory-postsale-workflow.repository';
import {
  buildBitrixDealFields,
  seedMockBitrixDeal,
} from '../helpers/bitrix-deal-fields';
import { IDEMPOTENCY_REPOSITORY } from '../../domains/idempotency/repository/idempotency.repository';

describe('StartWorkflowUseCase', () => {
  let useCase: StartWorkflowUseCase;
  let workflowRepository: InMemoryPostsaleWorkflowRepository;
  let bitrixProvider: MockBitrixProvider;
  let auditService: { emit: jest.Mock };
  let carTemplateRepository: InMemoryCarTemplateRepository;

  beforeEach(async () => {
    workflowRepository = new InMemoryPostsaleWorkflowRepository();
    bitrixProvider = new MockBitrixProvider();
    auditService = { emit: jest.fn().mockResolvedValue({}) };
    carTemplateRepository = new InMemoryCarTemplateRepository();

    const idempotencyRepository = new InMemoryIdempotencyRepository();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        StartWorkflowUseCase,
        LoadDealContextUseCase,
        MatchWorkflowTemplateUseCase,
        TemplateMatchingService,
        TemplateNoteSelectionService,
        EscalateWorkflowUseCase,
        FailWorkflowUseCase,
        IdempotencyService,
        CheckIdempotencyUseCase,
        EmitWorkflowEventUseCase,
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
        {
          provide: CarTemplateRepository,
          useValue: carTemplateRepository,
        },
      ],
    }).compile();

    useCase = moduleFixture.get(StartWorkflowUseCase);
  });

  function seedDeal(dealId: string, fields: Record<string, string>) {
    seedMockBitrixDeal(bitrixProvider, dealId, fields);
  }

  it('case 1: duplicate trigger does not create second workflow', async () => {
    seedDeal('deal-1', buildBitrixDealFields());

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
      providers: [
        StartWorkflowUseCase,
        LoadDealContextUseCase,
        MatchWorkflowTemplateUseCase,
        TemplateMatchingService,
        TemplateNoteSelectionService,
        EscalateWorkflowUseCase,
        FailWorkflowUseCase,
        IdempotencyService,
        CheckIdempotencyUseCase,
        EmitWorkflowEventUseCase,
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
        {
          provide: CarTemplateRepository,
          useValue: carTemplateRepository,
        },
      ],
    }).compile();

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
    seedDeal('deal-bitrix-fail', buildBitrixDealFields());
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

  it('escalates with template_not_found when no car template matches', async () => {
    seedDeal('deal-4', buildBitrixDealFields());

    const result = await useCase.execute({
      bitrixDealId: 'deal-4',
      idempotencyKey: 'deal-4-start',
    });

    expect(result.status).toBe(WorkflowStatus.ESCALATED);
    expect(result.templateMatchStatus).toBe(TemplateMatchStatus.NOT_FOUND);
    expect(result.isDuplicate).toBe(false);

    const persisted = await workflowRepository.findById(result.workflowId);
    expect(persisted?.dealContext).toMatchObject({ brand: 'BMW', model: 'X5' });
    expect(persisted?.product).toBe('3D EVAPREMIUM Z RANTAMI');
  });

  it('insufficient Bitrix data escalates before template match', async () => {
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
});
