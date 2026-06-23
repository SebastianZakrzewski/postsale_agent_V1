import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyService } from '../../domains/idempotency/services/idempotency.service';
import { CheckIdempotencyUseCase } from '../../domains/idempotency/use-cases/check-idempotency.use-case';
import { MatchWorkflowTemplateUseCase } from '../../domains/postsale-workflows/use-cases/match-workflow-template.use-case';
import { POSTSALE_WORKFLOW_REPOSITORY } from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import { TemplateMatchStatus, WorkflowStatus } from '../../lib/enums';
import { IDEMPOTENCY_REPOSITORY } from '../../domains/idempotency/repository/idempotency.repository';
import { InMemoryIdempotencyRepository } from '../helpers/in-memory-idempotency.repository';
import { InMemoryPostsaleWorkflowRepository } from '../helpers/in-memory-postsale-workflow.repository';

describe('MatchWorkflowTemplateUseCase', () => {
  let useCase: MatchWorkflowTemplateUseCase;
  let workflowRepository: InMemoryPostsaleWorkflowRepository;

  beforeEach(async () => {
    workflowRepository = new InMemoryPostsaleWorkflowRepository();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        MatchWorkflowTemplateUseCase,
        IdempotencyService,
        CheckIdempotencyUseCase,
        {
          provide: IDEMPOTENCY_REPOSITORY,
          useValue: new InMemoryIdempotencyRepository(),
        },
        {
          provide: POSTSALE_WORKFLOW_REPOSITORY,
          useValue: workflowRepository,
        },
      ],
    }).compile();

    useCase = moduleFixture.get(MatchWorkflowTemplateUseCase);
  });

  async function seedWorkflowWithContext() {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-1',
      status: WorkflowStatus.CONTEXT_LOADED,
    });
    await workflowRepository.updateDealContext(workflow.id, {
      dealContext: {
        bitrixDealId: 'deal-1',
        brand: 'BMW',
        model: 'X5',
        bodyType: 'SUV',
        generation: 'G05',
        product: '3D EVAPREMIUM Z RANTAMI',
      },
      product: '3D EVAPREMIUM Z RANTAMI',
      status: WorkflowStatus.CONTEXT_LOADED,
    });
    return workflow.id;
  }

  it('returns template_mapping_not_implemented for loaded deal context', async () => {
    const workflowId = await seedWorkflowWithContext();

    const outcome = await useCase.execute({ workflowId });

    expect(outcome.type).toBe('no_match');
    if (outcome.type === 'no_match') {
      expect(outcome.matchResult.status).toBe(TemplateMatchStatus.NOT_FOUND);
      expect(outcome.matchResult.escalationReason).toBe(
        'template_mapping_not_implemented',
      );
    }
  });
});
