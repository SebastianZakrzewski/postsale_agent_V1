import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { ApiModule } from '../../api/api.module';
import { WORKFLOW_EVENT_REPOSITORY } from '../../domains/audit/repository/workflow-event.repository';
import { AuditModule } from '../../domains/audit/audit.module';
import { IdempotencyModule } from '../../domains/idempotency/idempotency.module';
import { IDEMPOTENCY_REPOSITORY } from '../../domains/idempotency/repository/idempotency.repository';
import { POSTSALE_WORKFLOW_REPOSITORY } from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import { CAR_TEMPLATE_REPOSITORY } from '../../domains/template-matching/repository/car-template.repository';
import { DEFAULT_BITRIX_FIELD_MAPPING } from '../../domains/bitrix/config/bitrix-field-mapping';
import { BITRIX_PROVIDER } from '../../integrations/bitrix/bitrix.provider';
import { MockBitrixProvider } from '../../integrations/bitrix/mock-bitrix.provider';
import { TemplateMatchStatus, WorkflowStatus } from '../../lib/enums';
import { InMemoryIdempotencyRepository } from '../helpers/in-memory-idempotency.repository';
import { InMemoryPostsaleWorkflowRepository } from '../helpers/in-memory-postsale-workflow.repository';
import { InMemoryCarTemplateRepository } from '../helpers/in-memory-template.repositories';
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

    bitrixProvider.setDeal('deal-api-1', {
      id: 'deal-api-1',
      fields: {
        [DEFAULT_BITRIX_FIELD_MAPPING.brand]: 'BMW',
        [DEFAULT_BITRIX_FIELD_MAPPING.model]: 'X5',
        [DEFAULT_BITRIX_FIELD_MAPPING.bodyType]: 'SUV',
        [DEFAULT_BITRIX_FIELD_MAPPING.product]: 'EVA Mat',
        [DEFAULT_BITRIX_FIELD_MAPPING.generation]: 'G05',
      },
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
      .overrideProvider(CAR_TEMPLATE_REPOSITORY)
      .useValue(carTemplateRepository)
      .overrideProvider(BITRIX_PROVIDER)
      .useValue(bitrixProvider)
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
      status: WorkflowStatus.TEMPLATE_MATCHED,
      template_match_status: TemplateMatchStatus.MATCHED,
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
