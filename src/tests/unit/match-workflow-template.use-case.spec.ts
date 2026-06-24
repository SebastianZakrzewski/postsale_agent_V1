import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../domains/audit/services/audit.service';
import { EmitWorkflowEventUseCase } from '../../domains/audit/use-cases/emit-workflow-event.use-case';
import { IdempotencyService } from '../../domains/idempotency/services/idempotency.service';
import { CheckIdempotencyUseCase } from '../../domains/idempotency/use-cases/check-idempotency.use-case';
import { MatchWorkflowTemplateUseCase } from '../../domains/postsale-workflows/use-cases/match-workflow-template.use-case';
import { POSTSALE_WORKFLOW_REPOSITORY } from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import { CarTemplateRepository } from '../../domains/template-matching/repository/car-template.repository.port';
import { TemplateMatchingService } from '../../domains/template-matching/services/template-matching.service';
import { TemplateNoteSelectionService } from '../../domains/template-matching/services/template-note-selection.service';
import {
  TemplateMatchStatus,
  WorkflowEventType,
  WorkflowStatus,
} from '../../lib/enums';
import { IDEMPOTENCY_REPOSITORY } from '../../domains/idempotency/repository/idempotency.repository';
import {
  buildAcuraMdxTemplate,
  InMemoryCarTemplateRepository,
} from '../helpers/in-memory-car-template.repository';
import { InMemoryIdempotencyRepository } from '../helpers/in-memory-idempotency.repository';
import { InMemoryPostsaleWorkflowRepository } from '../helpers/in-memory-postsale-workflow.repository';

describe('MatchWorkflowTemplateUseCase', () => {
  let useCase: MatchWorkflowTemplateUseCase;
  let workflowRepository: InMemoryPostsaleWorkflowRepository;
  let carTemplateRepository: InMemoryCarTemplateRepository;
  let auditService: { emit: jest.Mock };

  beforeEach(async () => {
    workflowRepository = new InMemoryPostsaleWorkflowRepository();
    carTemplateRepository = new InMemoryCarTemplateRepository();
    auditService = { emit: jest.fn().mockResolvedValue({}) };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        MatchWorkflowTemplateUseCase,
        TemplateMatchingService,
        TemplateNoteSelectionService,
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
          provide: CarTemplateRepository,
          useValue: carTemplateRepository,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    }).compile();

    useCase = moduleFixture.get(MatchWorkflowTemplateUseCase);
  });

  async function seedAcuraWorkflow(setVariantId = '274') {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-acura',
      status: WorkflowStatus.CONTEXT_LOADED,
    });
    await workflowRepository.updateDealContext(workflow.id, {
      dealContext: {
        bitrixDealId: 'deal-acura',
        brand: 'Acura',
        model: 'MDX 2 gen',
        bodyType: 'SUV 7 osobowy',
        generation: '2006-2013',
        product: '3D EVAPREMIUM Z RANTAMI',
        productEnumId: '264',
        setVariantId,
      },
      product: '3D EVAPREMIUM Z RANTAMI',
      status: WorkflowStatus.CONTEXT_LOADED,
    });
    return workflow.id;
  }

  it('matches Acura MDX and persists car_template_id', async () => {
    carTemplateRepository.seed(buildAcuraMdxTemplate());
    const workflowId = await seedAcuraWorkflow('274');

    const outcome = await useCase.execute({ workflowId });

    expect(outcome.type).toBe('matched');
    if (outcome.type === 'matched') {
      expect(outcome.matchResult.status).toBe(TemplateMatchStatus.MATCHED);
      expect(outcome.matchResult.carTemplateId).toBe('template-acura-mdx');
      expect(outcome.workflow.status).toBe(WorkflowStatus.TEMPLATE_MATCHED);
      expect(outcome.workflow.carTemplateId).toBe('template-acura-mdx');
    }

    expect(auditService.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: WorkflowEventType.TEMPLATE_MATCH_SUCCEEDED,
        statusAfter: WorkflowStatus.TEMPLATE_MATCHED,
      }),
    );
  });

  it('returns missing_generation when generation is absent', async () => {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-no-gen',
      status: WorkflowStatus.CONTEXT_LOADED,
    });
    await workflowRepository.updateDealContext(workflow.id, {
      dealContext: {
        bitrixDealId: 'deal-no-gen',
        brand: 'BMW',
        model: 'X5',
        bodyType: 'SUV',
        generation: null,
        product: '3D EVAPREMIUM Z RANTAMI',
      },
      product: '3D EVAPREMIUM Z RANTAMI',
      status: WorkflowStatus.CONTEXT_LOADED,
    });

    const outcome = await useCase.execute({ workflowId: workflow.id });

    expect(outcome.type).toBe('no_match');
    if (outcome.type === 'no_match') {
      expect(outcome.matchResult.escalationReason).toBe('missing_generation');
    }
  });
});
