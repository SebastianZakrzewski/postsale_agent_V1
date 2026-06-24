import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { ApiModule } from '../../api/api.module';
import { WORKFLOW_EVENT_REPOSITORY } from '../../domains/audit/repository/workflow-event.repository';
import { AuditModule } from '../../domains/audit/audit.module';
import { IdempotencyModule } from '../../domains/idempotency/idempotency.module';
import { IDEMPOTENCY_REPOSITORY } from '../../domains/idempotency/repository/idempotency.repository';
import { POSTSALE_WORKFLOW_REPOSITORY } from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import { buildBitrixDealFields } from '../helpers/bitrix-deal-fields';
import { BITRIX_PROVIDER } from '../../integrations/bitrix/bitrix.provider';
import { MockBitrixProvider } from '../../integrations/bitrix/mock-bitrix.provider';
import { TemplateMatchStatus, WorkflowStatus } from '../../lib/enums';
import { SupabaseCarTemplateRepository } from '../../integrations/supabase/supabase-car-template.repository';
import { InMemoryCarTemplateRepository } from '../helpers/in-memory-car-template.repository';
import { InMemoryIdempotencyRepository } from '../helpers/in-memory-idempotency.repository';
import { InMemoryPostsaleWorkflowRepository } from '../helpers/in-memory-postsale-workflow.repository';
import {
  AppendWorkflowEventInput,
  WorkflowEventRepository,
} from '../../domains/audit/repository/workflow-event.repository';
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

describe('WebhooksController (integration)', () => {
  let app: INestApplication;
  let bitrixProvider: MockBitrixProvider;

  beforeEach(async () => {
    bitrixProvider = new MockBitrixProvider();

    bitrixProvider.setDeal('deal-api-1', {
      id: 'deal-api-1',
      fields: buildBitrixDealFields(),
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ApiModule, IdempotencyModule, AuditModule],
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

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /webhooks/workflow/start returns workflow result for valid payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/webhooks/workflow/start')
      .send({
        bitrix_deal_id: 'deal-api-1',
        idempotency_key: 'deal-api-1-start',
        request_id: 'req-n8n-1',
      })
      .expect(200);

    expect(response.body).toEqual({
      workflow_id: expect.any(String),
      status: WorkflowStatus.ESCALATED,
      template_match_status: TemplateMatchStatus.NOT_FOUND,
      is_duplicate: false,
    });
  });

  it('POST /webhooks/workflow/start returns 400 for invalid payload', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/workflow/start')
      .send({ bitrix_deal_id: 'deal-api-1' })
      .expect(400);
  });

  it('POST /webhooks/workflow/start returns duplicate result on second call', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/workflow/start')
      .send({
        bitrix_deal_id: 'deal-api-1',
        idempotency_key: 'deal-api-1-start',
      })
      .expect(200);

    const duplicate = await request(app.getHttpServer())
      .post('/webhooks/workflow/start')
      .send({
        bitrix_deal_id: 'deal-api-1',
        idempotency_key: 'deal-api-1-start',
      })
      .expect(200);

    expect(duplicate.body.is_duplicate).toBe(true);
  });
});
