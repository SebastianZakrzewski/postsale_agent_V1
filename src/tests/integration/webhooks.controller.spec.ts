import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { ApiModule } from '../../api/api.module';
import { WORKFLOW_EVENT_REPOSITORY } from '../../domains/audit/repository/workflow-event.repository';
import { AuditModule } from '../../domains/audit/audit.module';
import {
  CUSTOMER_MESSAGE_REPOSITORY,
  MESSAGE_ATTACHMENT_REPOSITORY,
  MESSAGE_LINK_REPOSITORY,
  OUTGOING_MESSAGE_REPOSITORY,
} from '../../domains/email/repository/message.repository';
import { IdempotencyModule } from '../../domains/idempotency/idempotency.module';
import { IDEMPOTENCY_REPOSITORY } from '../../domains/idempotency/repository/idempotency.repository';
import { LANGFLOW_RUN_REPOSITORY } from '../../domains/langflow/repository/langflow-run.repository';
import { POSTSALE_WORKFLOW_REPOSITORY } from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import { REQUIREMENT_EVIDENCE_REPOSITORY } from '../../domains/requirements/repository/requirement-evidence.repository';
import { WORKFLOW_REQUIREMENT_REPOSITORY } from '../../domains/requirements/repository/workflow-requirement.repository';
import { SIDE_EFFECT_RECORD_REPOSITORY } from '../../domains/side-effects/repository/side-effect-record.repository';
import { buildBitrixDealFields } from '../helpers/bitrix-deal-fields';
import { BITRIX_PROVIDER } from '../../integrations/bitrix/bitrix.provider';
import { EMAIL_PROVIDER } from '../../integrations/email/email.provider';
import { LANGFLOW_PROVIDER } from '../../integrations/langflow/langflow.provider';
import { MockBitrixProvider } from '../../integrations/bitrix/mock-bitrix.provider';
import {
  RequirementLabel,
  RequirementStatus,
  SideEffectRecordStatus,
  TemplateMatchStatus,
  WorkflowStatus,
} from '../../lib/enums';
import { SupabaseCarTemplateRepository } from '../../integrations/supabase/supabase-car-template.repository';
import { TELEGRAM_PROVIDER } from '../../integrations/telegram/telegram.provider';
import { InMemoryCarTemplateRepository } from '../helpers/in-memory-car-template.repository';
import { InMemoryCustomerMessageRepository } from '../helpers/in-memory-customer-message.repository';
import { InMemoryIdempotencyRepository } from '../helpers/in-memory-idempotency.repository';
import { InMemoryLangflowRunRepository } from '../helpers/in-memory-langflow-run.repository';
import { InMemoryMessageAttachmentRepository } from '../helpers/in-memory-message-attachment.repository';
import { InMemoryMessageLinkRepository } from '../helpers/in-memory-message-link.repository';
import { InMemoryOutgoingMessageRepository } from '../helpers/in-memory-outgoing-message.repository';
import { InMemoryPostsaleWorkflowRepository } from '../helpers/in-memory-postsale-workflow.repository';
import { InMemoryRequirementEvidenceRepository } from '../helpers/in-memory-requirement-evidence.repository';
import { InMemoryWorkflowRequirementRepository } from '../helpers/in-memory-workflow-requirement.repository';
import { MockEmailProvider } from '../helpers/mock-email.provider';
import { MockLangflowProvider } from '../helpers/mock-langflow.provider';
import { MockTelegramProvider } from '../helpers/mock-telegram.provider';
import {
  AppendWorkflowEventInput,
  WorkflowEventRepository,
} from '../../domains/audit/repository/workflow-event.repository';
import {
  CreateSideEffectRecordInput,
  SideEffectRecordRepository,
} from '../../domains/side-effects/repository/side-effect-record.repository';
import { WorkflowEventRow, SideEffectRecordRow } from '../../lib/persistence';

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

class InMemorySideEffectRecordRepository extends SideEffectRecordRepository {
  private readonly records = new Map<string, SideEffectRecordRow>();

  async createPending(
    input: CreateSideEffectRecordInput,
  ): Promise<SideEffectRecordRow> {
    const row: SideEffectRecordRow = {
      id: `se-${this.records.size + 1}`,
      workflow_id: input.workflowId,
      side_effect_type: input.sideEffectType,
      idempotency_key: input.idempotencyKey,
      status: SideEffectRecordStatus.PENDING,
      retry_allowed: false,
      error_code: null,
      provider_response: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.records.set(input.idempotencyKey, row);
    return row;
  }

  async findByIdempotencyKey(key: string): Promise<SideEffectRecordRow | null> {
    return this.records.get(key) ?? null;
  }

  async updateStatus(): Promise<void> {}
}

describe('WebhooksController (integration)', () => {
  let app: INestApplication;
  let bitrixProvider: MockBitrixProvider;
  let workflowRepository: InMemoryPostsaleWorkflowRepository;
  let outgoingRepository: InMemoryOutgoingMessageRepository;
  let requirementRepository: InMemoryWorkflowRequirementRepository;
  let originalWebhookSecret: string | undefined;

  beforeEach(async () => {
    originalWebhookSecret = process.env.N8N_WEBHOOK_SECRET;
    delete process.env.N8N_WEBHOOK_SECRET;

    bitrixProvider = new MockBitrixProvider();
    workflowRepository = new InMemoryPostsaleWorkflowRepository();
    outgoingRepository = new InMemoryOutgoingMessageRepository();
    requirementRepository = new InMemoryWorkflowRequirementRepository();

    bitrixProvider.setDeal('deal-api-1', {
      id: 'deal-api-1',
      fields: buildBitrixDealFields(),
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ApiModule, IdempotencyModule, AuditModule],
    })
      .overrideProvider(POSTSALE_WORKFLOW_REPOSITORY)
      .useValue(workflowRepository)
      .overrideProvider(IDEMPOTENCY_REPOSITORY)
      .useValue(new InMemoryIdempotencyRepository())
      .overrideProvider(WORKFLOW_EVENT_REPOSITORY)
      .useValue(new InMemoryWorkflowEventRepository())
      .overrideProvider(BITRIX_PROVIDER)
      .useValue(bitrixProvider)
      .overrideProvider(SupabaseCarTemplateRepository)
      .useValue(new InMemoryCarTemplateRepository())
      .overrideProvider(OUTGOING_MESSAGE_REPOSITORY)
      .useValue(outgoingRepository)
      .overrideProvider(CUSTOMER_MESSAGE_REPOSITORY)
      .useValue(new InMemoryCustomerMessageRepository())
      .overrideProvider(MESSAGE_ATTACHMENT_REPOSITORY)
      .useValue(new InMemoryMessageAttachmentRepository())
      .overrideProvider(MESSAGE_LINK_REPOSITORY)
      .useValue(new InMemoryMessageLinkRepository())
      .overrideProvider(WORKFLOW_REQUIREMENT_REPOSITORY)
      .useValue(requirementRepository)
      .overrideProvider(REQUIREMENT_EVIDENCE_REPOSITORY)
      .useValue(new InMemoryRequirementEvidenceRepository())
      .overrideProvider(LANGFLOW_PROVIDER)
      .useValue(new MockLangflowProvider())
      .overrideProvider(LANGFLOW_RUN_REPOSITORY)
      .useValue(new InMemoryLangflowRunRepository())
      .overrideProvider(SIDE_EFFECT_RECORD_REPOSITORY)
      .useValue(new InMemorySideEffectRecordRepository())
      .overrideProvider(EMAIL_PROVIDER)
      .useValue(new MockEmailProvider())
      .overrideProvider(TELEGRAM_PROVIDER)
      .useValue(new MockTelegramProvider())
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    if (originalWebhookSecret === undefined) {
      delete process.env.N8N_WEBHOOK_SECRET;
    } else {
      process.env.N8N_WEBHOOK_SECRET = originalWebhookSecret;
    }
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

  it('rejects webhook calls when X-Webhook-Secret is invalid', async () => {
    process.env.N8N_WEBHOOK_SECRET = 'expected-secret';

    await request(app.getHttpServer())
      .post('/webhooks/workflow/start')
      .send({
        bitrix_deal_id: 'deal-api-1',
        idempotency_key: 'deal-api-1-auth-fail',
      })
      .expect(401);

    await request(app.getHttpServer())
      .post('/webhooks/workflow/start')
      .set('X-Webhook-Secret', 'expected-secret')
      .send({
        bitrix_deal_id: 'deal-api-1',
        idempotency_key: 'deal-api-1-auth-ok',
      })
      .expect(200);
  });

  it('POST /webhooks/email/inbound escalates unmatched reply', async () => {
    const response = await request(app.getHttpServer())
      .post('/webhooks/email/inbound')
      .send({
        messageId: 'gmail-unmatched-1',
        threadId: 'thread-unmatched-1',
        inReplyTo: 'missing-provider-id',
        from: { email: 'customer@example.com' },
        to: [{ email: 'sales@evapremium.com' }],
        subject: 'Re: test',
        bodyText: 'hello',
        receivedAt: '2026-06-26T10:00:00.000Z',
      })
      .expect(200);

    expect(response.body).toEqual({
      ingest: 'escalated_unmatched',
      workflow_id: null,
      status: null,
    });
  });

  it('POST /webhooks/email/inbound ingests matched reply', async () => {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-inbound',
      status: WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY,
    });

    await outgoingRepository.create({
      workflow_id: workflow.id,
      customer_message_id: null,
      to_address: 'customer@example.com',
      subject: 'Initial',
      body: 'Please reply',
      provider_message_id: 'provider-inbound-1',
    });

    const response = await request(app.getHttpServer())
      .post('/webhooks/email/inbound')
      .send({
        messageId: 'gmail-inbound-1',
        threadId: 'thread-inbound-1',
        inReplyTo: 'provider-inbound-1',
        from: { email: 'customer@example.com' },
        to: [{ email: 'sales@evapremium.com' }],
        subject: 'Re: Initial',
        bodyText: 'reply body',
        receivedAt: '2026-06-26T10:00:00.000Z',
      })
      .expect(200);

    expect(response.body.ingest).toBe('ingested');
    expect(response.body.workflow_id).toBe(workflow.id);
  });

  it('POST /webhooks/workflow/follow-up-check returns waiting when follow-up not due', async () => {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-followup',
      status: WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY,
    });
    await workflowRepository.updateTemplateMatch(workflow.id, {
      templateMatchStatus: TemplateMatchStatus.MATCHED,
      status: WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY,
      carTemplateId: 'tpl-1',
    });
    await requirementRepository.create({
      workflow_id: workflow.id,
      label: RequirementLabel.YES_NO_INFO,
      status: RequirementStatus.PENDING,
      source_note: 'note',
      source_field: 'notes_front_3d',
      classification_reason: 'test',
      confidence: 0.9,
    });

    const response = await request(app.getHttpServer())
      .post('/webhooks/workflow/follow-up-check')
      .send({
        workflow_id: workflow.id,
        now: new Date().toISOString(),
      })
      .expect(200);

    expect(response.body).toMatchObject({
      type: 'waiting',
      workflowId: workflow.id,
      status: WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY,
      reason: 'follow_up_not_due',
    });
  });

  it('POST /webhooks/workflow/follow-up-check returns 400 without workflow_id', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/workflow/follow-up-check')
      .send({})
      .expect(400);
  });
});
