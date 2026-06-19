import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../domains/audit/services/audit.service';
import { EmitWorkflowEventUseCase } from '../../domains/audit/use-cases/emit-workflow-event.use-case';
import { IdempotencyService } from '../../domains/idempotency/services/idempotency.service';
import { CheckIdempotencyUseCase } from '../../domains/idempotency/use-cases/check-idempotency.use-case';
import { MatchWorkflowTemplateUseCase } from '../../domains/postsale-workflows/use-cases/match-workflow-template.use-case';
import { POSTSALE_WORKFLOW_REPOSITORY } from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import { TemplateMatchingModule } from '../../domains/template-matching/template-matching.module';
import { CAR_TEMPLATE_REPOSITORY } from '../../domains/template-matching/repository/car-template.repository';
import {
  TemplateMatchStatus,
  WorkflowEventType,
  WorkflowStatus,
} from '../../lib/enums';
import { IDEMPOTENCY_REPOSITORY } from '../../domains/idempotency/repository/idempotency.repository';
import { InMemoryIdempotencyRepository } from '../helpers/in-memory-idempotency.repository';
import { InMemoryPostsaleWorkflowRepository } from '../helpers/in-memory-postsale-workflow.repository';
import { InMemoryCarTemplateRepository } from '../helpers/in-memory-template.repositories';

describe('MatchWorkflowTemplateUseCase', () => {
  let useCase: MatchWorkflowTemplateUseCase;
  let workflowRepository: InMemoryPostsaleWorkflowRepository;
  let auditService: { emit: jest.Mock };
  let carTemplateId: string;

  beforeEach(async () => {
    workflowRepository = new InMemoryPostsaleWorkflowRepository();
    auditService = { emit: jest.fn().mockResolvedValue({}) };

    const carTemplateRepository = new InMemoryCarTemplateRepository();
    const inserted = await carTemplateRepository.insertTemplate({
      importBatchId: 'batch-1',
      brand: 'bmw',
      model: 'x5',
      bodyType: 'suv',
      generation: 'g05',
      aliases: [],
      rawRowJson: {},
    });
    carTemplateId = inserted.id;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TemplateMatchingModule],
      providers: [
        MatchWorkflowTemplateUseCase,
        IdempotencyService,
        CheckIdempotencyUseCase,
        EmitWorkflowEventUseCase,
        {
          provide: IDEMPOTENCY_REPOSITORY,
          useValue: new InMemoryIdempotencyRepository(),
        },
        {
          provide: POSTSALE_WORKFLOW_REPOSITORY,
          useValue: workflowRepository,
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

    useCase = moduleFixture.get(MatchWorkflowTemplateUseCase);
  });

  async function seedContextLoadedWorkflow(workflowId: string) {
    await workflowRepository.updateDealContext(workflowId, {
      dealContext: {
        bitrixDealId: 'deal-match-1',
        brand: 'BMW',
        model: 'X5',
        bodyType: 'SUV',
        generation: 'G05',
        product: 'EVA Mat',
      },
      product: 'EVA Mat',
      status: WorkflowStatus.CONTEXT_LOADED,
    });
  }

  it('sets car_template_id and TEMPLATE_MATCHED on match', async () => {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-match-1',
      status: WorkflowStatus.STARTED,
    });
    await seedContextLoadedWorkflow(workflow.id);

    const outcome = await useCase.execute({ workflowId: workflow.id });

    expect(outcome.type).toBe('success');
    if (outcome.type !== 'success') {
      return;
    }

    expect(outcome.carTemplateId).toBe(carTemplateId);
    expect(outcome.capability.workflowId).toBe(workflow.id);
    expect(outcome.capability.status).toBe(WorkflowStatus.TEMPLATE_MATCHED);
    expect(outcome.workflow.id).toBe(workflow.id);

    const updated = await workflowRepository.findById(workflow.id);
    expect(updated?.status).toBe(WorkflowStatus.TEMPLATE_MATCHED);
    expect(updated?.carTemplateId).toBe(carTemplateId);
    expect(updated?.templateMatchStatus).toBe(TemplateMatchStatus.MATCHED);
    expect(auditService.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: WorkflowEventType.TEMPLATE_MATCH_SUCCEEDED,
      }),
    );
  });

  it('returns already_matched without re-running match logic', async () => {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-match-2',
      status: WorkflowStatus.STARTED,
    });
    await seedContextLoadedWorkflow(workflow.id);

    await useCase.execute({ workflowId: workflow.id });

    const retry = await useCase.execute({ workflowId: workflow.id });
    expect(retry.type).toBe('already_matched');
    if (retry.type === 'already_matched') {
      expect(retry.capability.status).toBe(WorkflowStatus.TEMPLATE_MATCHED);
    }
  });

  it('throws when deal context is not persisted', async () => {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-match-3',
      status: WorkflowStatus.STARTED,
    });

    await expect(useCase.execute({ workflowId: workflow.id })).rejects.toThrow(
      /Deal context not persisted/,
    );
  });

  it('returns no_match with capability metadata when template is not found', async () => {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-match-4',
      status: WorkflowStatus.STARTED,
    });
    await workflowRepository.updateDealContext(workflow.id, {
      dealContext: {
        bitrixDealId: 'deal-match-4',
        brand: 'Unknown',
        model: 'Model',
        bodyType: 'SUV',
        generation: 'Gen1',
        product: 'EVA Mat',
      },
      product: 'EVA Mat',
      status: WorkflowStatus.CONTEXT_LOADED,
    });

    const outcome = await useCase.execute({ workflowId: workflow.id });

    expect(outcome.type).toBe('no_match');
    if (outcome.type !== 'no_match') {
      return;
    }

    expect(outcome.matchResult.status).toBe(TemplateMatchStatus.NOT_FOUND);
    expect(outcome.capability.workflowId).toBe(workflow.id);
    expect(outcome.capability.status).toBe(WorkflowStatus.CONTEXT_LOADED);
    expect(outcome.capability.allowedNextActions).toContain('match_template');
    expect(outcome.workflow.id).toBe(workflow.id);
  });
});
