import { Test, TestingModule } from '@nestjs/testing';
import { AuditModule } from '../../domains/audit/audit.module';
import { IdempotencyModule } from '../../domains/idempotency/idempotency.module';
import { PostsaleWorkflowsModule } from '../../domains/postsale-workflows/postsale-workflows.module';
import { StartWorkflowUseCase } from '../../domains/postsale-workflows/use-cases/start-workflow.use-case';
import { POSTSALE_WORKFLOW_REPOSITORY } from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import { CAR_TEMPLATE_REPOSITORY } from '../../domains/template-matching/repository/car-template.repository';
import { BITRIX_PROVIDER } from '../../integrations/bitrix/bitrix.provider';
import { MockBitrixProvider } from '../../integrations/bitrix/mock-bitrix.provider';
import { DEFAULT_BITRIX_FIELD_MAPPING } from '../../domains/bitrix/config/bitrix-field-mapping';
import { IDEMPOTENCY_REPOSITORY } from '../../domains/idempotency/repository/idempotency.repository';
import { WORKFLOW_EVENT_REPOSITORY } from '../../domains/audit/repository/workflow-event.repository';
import { TemplateMatchStatus, WorkflowStatus } from '../../lib/enums';
import { InMemoryIdempotencyRepository } from '../helpers/in-memory-idempotency.repository';
import { InMemoryPostsaleWorkflowRepository } from '../helpers/in-memory-postsale-workflow.repository';
import { InMemoryCarTemplateRepository } from '../helpers/in-memory-template.repositories';

import { WorkflowEventRepository } from '../../domains/audit/repository/workflow-event.repository';
import { AppendWorkflowEventInput } from '../../domains/audit/repository/workflow-event.repository';
import { WorkflowEventRow } from '../../lib/persistence';

class InMemoryWorkflowEventRepository extends WorkflowEventRepository {
  private readonly events: WorkflowEventRow[] = [];

  async append(input: AppendWorkflowEventInput): Promise<WorkflowEventRow> {
    const row: WorkflowEventRow = {
      id: `event-${this.events.length + 1}`,
      workflow_id: input.workflowId,
      event_type: input.eventType,
      payload: input.payload ?? {},
      created_at: new Date().toISOString(),
    };
    this.events.push(row);
    return row;
  }

  async findByWorkflowId(workflowId: string): Promise<WorkflowEventRow[]> {
    return this.events.filter((event) => event.workflow_id === workflowId);
  }
}

describe('PostsaleWorkflowsModule (integration)', () => {
  let useCase: StartWorkflowUseCase;
  let bitrixProvider: MockBitrixProvider;

  beforeEach(async () => {
    bitrixProvider = new MockBitrixProvider();
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

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PostsaleWorkflowsModule, IdempotencyModule, AuditModule],
    })
      .overrideProvider(POSTSALE_WORKFLOW_REPOSITORY)
      .useValue(new InMemoryPostsaleWorkflowRepository())
      .overrideProvider(IDEMPOTENCY_REPOSITORY)
      .useValue(new InMemoryIdempotencyRepository())
      .overrideProvider(WORKFLOW_EVENT_REPOSITORY)
      .useValue(new InMemoryWorkflowEventRepository())
      .overrideProvider(CAR_TEMPLATE_REPOSITORY)
      .useValue(carTemplateRepository)
      .overrideProvider(BITRIX_PROVIDER)
      .useValue(bitrixProvider)
      .compile();

    useCase = moduleFixture.get(StartWorkflowUseCase);
  });

  it('wires StartWorkflowUseCase through module', async () => {
    bitrixProvider.setDeal('deal-10', {
      id: 'deal-10',
      fields: {
        [DEFAULT_BITRIX_FIELD_MAPPING.brand]: 'BMW',
        [DEFAULT_BITRIX_FIELD_MAPPING.model]: 'X5',
        [DEFAULT_BITRIX_FIELD_MAPPING.bodyType]: 'SUV',
        [DEFAULT_BITRIX_FIELD_MAPPING.product]: 'EVA Mat',
        [DEFAULT_BITRIX_FIELD_MAPPING.generation]: 'G05',
      },
    });

    const result = await useCase.execute({
      bitrixDealId: 'deal-10',
      idempotencyKey: 'deal-10-start',
    });

    expect(result.status).toBe(WorkflowStatus.TEMPLATE_MATCHED);
    expect(result.templateMatchStatus).toBe(TemplateMatchStatus.MATCHED);
  });
});
