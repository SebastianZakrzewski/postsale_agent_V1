import { Test, TestingModule } from '@nestjs/testing';
import { GetWorkflowContextUseCase } from '../../domains/postsale-workflows/use-cases/get-workflow-context.use-case';
import { POSTSALE_WORKFLOW_REPOSITORY } from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import { TemplateMatchStatus, WorkflowStatus } from '../../lib/enums';
import { InMemoryPostsaleWorkflowRepository } from '../helpers/in-memory-postsale-workflow.repository';

describe('GetWorkflowContextUseCase', () => {
  let useCase: GetWorkflowContextUseCase;
  let workflowRepository: InMemoryPostsaleWorkflowRepository;

  beforeEach(async () => {
    workflowRepository = new InMemoryPostsaleWorkflowRepository();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        GetWorkflowContextUseCase,
        {
          provide: POSTSALE_WORKFLOW_REPOSITORY,
          useValue: workflowRepository,
        },
      ],
    }).compile();

    useCase = moduleFixture.get(GetWorkflowContextUseCase);
  });

  it('returns persisted deal context and car template id', async () => {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-ctx-1',
      status: WorkflowStatus.STARTED,
    });

    await workflowRepository.updateDealContext(workflow.id, {
      dealContext: {
        bitrixDealId: 'deal-ctx-1',
        brand: 'BMW',
        model: 'X5',
        bodyType: 'SUV',
        generation: 'G05',
        product: 'EVA Mat',
      },
      product: 'EVA Mat',
      status: WorkflowStatus.CONTEXT_LOADED,
    });

    await workflowRepository.updateCarTemplateMatch(workflow.id, {
      carTemplateId: 'template-1',
      templateMatchStatus: TemplateMatchStatus.MATCHED,
      status: WorkflowStatus.TEMPLATE_MATCHED,
    });

    const view = await useCase.execute({ workflowId: workflow.id });

    expect(view.dealContext).toMatchObject({ brand: 'BMW', model: 'X5' });
    expect(view.carTemplateId).toBe('template-1');
    expect(view.workflow.status).toBe(WorkflowStatus.TEMPLATE_MATCHED);
  });

  it('throws when workflow is not found', async () => {
    await expect(
      useCase.execute({ workflowId: 'missing-workflow' }),
    ).rejects.toThrow(/Workflow not found/);
  });
});
