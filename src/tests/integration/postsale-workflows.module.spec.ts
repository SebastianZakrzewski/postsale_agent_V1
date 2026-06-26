import { Test, TestingModule } from '@nestjs/testing';
import { AuditModule } from '../../domains/audit/audit.module';
import { IdempotencyModule } from '../../domains/idempotency/idempotency.module';
import { PostsaleWorkflowsModule } from '../../domains/postsale-workflows/postsale-workflows.module';
import { StartWorkflowUseCase } from '../../domains/postsale-workflows/use-cases/start-workflow.use-case';
import { POSTSALE_WORKFLOW_REPOSITORY } from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import { BITRIX_PROVIDER } from '../../integrations/bitrix/bitrix.provider';
import { MockBitrixProvider } from '../../integrations/bitrix/mock-bitrix.provider';
import {
  buildBitrixDealFields,
  seedMockBitrixDeal,
} from '../helpers/bitrix-deal-fields';
import { IDEMPOTENCY_REPOSITORY } from '../../domains/idempotency/repository/idempotency.repository';
import { WORKFLOW_EVENT_REPOSITORY } from '../../domains/audit/repository/workflow-event.repository';
import { TemplateMatchStatus, WorkflowStatus } from '../../lib/enums';
import { SupabaseCarTemplateRepository } from '../../integrations/supabase/supabase-car-template.repository';
import { InMemoryCarTemplateRepository } from '../helpers/in-memory-car-template.repository';
import { InMemoryIdempotencyRepository } from '../helpers/in-memory-idempotency.repository';
import { InMemoryPostsaleWorkflowRepository } from '../helpers/in-memory-postsale-workflow.repository';

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

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PostsaleWorkflowsModule, IdempotencyModule, AuditModule],
    })
      .overrideProvider(POSTSALE_WORKFLOW_REPOSITORY)
      .useValue(new InMemoryPostsaleWorkflowRepository())
      .overrideProvider(IDEMPOTENCY_REPOSITORY)
      .useValue(new InMemoryIdempotencyRepository())
      .overrideProvider(WORKFLOW_EVENT_REPOSITORY)
      .useValue(new InMemoryWorkflowEventRepository())
      .overrideProvider(BITRIX_PROVIDER)
      .useValue(bitrixProvider)
      .overrideProvider(SupabaseCarTemplateRepository)
      .useValue(new InMemoryCarTemplateRepository())
      .compile();

    useCase = moduleFixture.get(StartWorkflowUseCase);
  });

  it('wires StartWorkflowUseCase through module', async () => {
    seedMockBitrixDeal(bitrixProvider, 'deal-10', buildBitrixDealFields());

    const result = await useCase.execute({
      bitrixDealId: 'deal-10',
      idempotencyKey: 'deal-10-start',
    });

    expect(result.status).toBe(WorkflowStatus.ESCALATED);
    expect(result.templateMatchStatus).toBe(TemplateMatchStatus.NOT_FOUND);
  });
});
