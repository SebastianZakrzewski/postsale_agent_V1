import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../domains/audit/services/audit.service';
import { EmitWorkflowEventUseCase } from '../../domains/audit/use-cases/emit-workflow-event.use-case';
import { OUTGOING_MESSAGE_REPOSITORY } from '../../domains/email/repository/message.repository';
import { SendInitialEmailUseCase } from '../../domains/email/use-cases/send-initial-email.use-case';
import { LANGFLOW_RUN_REPOSITORY } from '../../domains/langflow/repository/langflow-run.repository';
import { LangflowRunRecorderService } from '../../domains/langflow/services/langflow-run-recorder.service';
import { EscalateWorkflowUseCase } from '../../domains/postsale-workflows/use-cases/escalate-workflow.use-case';
import { GetWorkflowContextUseCase } from '../../domains/postsale-workflows/use-cases/get-workflow-context.use-case';
import { POSTSALE_WORKFLOW_REPOSITORY } from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import { WORKFLOW_REQUIREMENT_REPOSITORY } from '../../domains/requirements/repository/workflow-requirement.repository';
import {
  CreateSideEffectRecordInput,
  SIDE_EFFECT_RECORD_REPOSITORY,
  SideEffectRecordRepository,
} from '../../domains/side-effects/repository/side-effect-record.repository';
import { SideEffectGuard } from '../../domains/side-effects/guards/side-effect.guard';
import { SideEffectService } from '../../domains/side-effects/services/side-effect.service';
import { EMAIL_PROVIDER } from '../../integrations/email/email.provider';
import { LANGFLOW_PROVIDER } from '../../integrations/langflow/langflow.provider';
import {
  RequirementLabel,
  RequirementStatus,
  SideEffectRecordStatus,
  SideEffectType,
  WorkflowStatus,
} from '../../lib/enums';
import { SideEffectRecordRow } from '../../lib/persistence';
import { InMemoryLangflowRunRepository } from '../helpers/in-memory-langflow-run.repository';
import { InMemoryOutgoingMessageRepository } from '../helpers/in-memory-outgoing-message.repository';
import { InMemoryPostsaleWorkflowRepository } from '../helpers/in-memory-postsale-workflow.repository';
import { InMemoryWorkflowRequirementRepository } from '../helpers/in-memory-workflow-requirement.repository';
import { MockEmailProvider } from '../helpers/mock-email.provider';
import { MockLangflowProvider } from '../helpers/mock-langflow.provider';

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

  async updateStatus(
    id: string,
    status: SideEffectRecordStatus,
    errorCode?: string,
    retryAllowed?: boolean,
    providerResponse?: Record<string, unknown>,
  ): Promise<void> {
    for (const row of this.records.values()) {
      if (row.id === id) {
        row.status = status;
        row.error_code = errorCode ?? null;
        row.retry_allowed = retryAllowed ?? row.retry_allowed;
        row.provider_response = providerResponse ?? row.provider_response;
        row.updated_at = new Date().toISOString();
      }
    }
  }
}

describe('SendInitialEmailUseCase', () => {
  let useCase: SendInitialEmailUseCase;
  let workflowRepository: InMemoryPostsaleWorkflowRepository;
  let requirementRepository: InMemoryWorkflowRequirementRepository;
  let outgoingRepository: InMemoryOutgoingMessageRepository;
  let mockLangflow: MockLangflowProvider;
  let mockEmail: MockEmailProvider;
  let sideEffectRecords: InMemorySideEffectRecordRepository;
  let langflowRuns: InMemoryLangflowRunRepository;

  beforeEach(async () => {
    workflowRepository = new InMemoryPostsaleWorkflowRepository();
    requirementRepository = new InMemoryWorkflowRequirementRepository();
    outgoingRepository = new InMemoryOutgoingMessageRepository();
    sideEffectRecords = new InMemorySideEffectRecordRepository();
    langflowRuns = new InMemoryLangflowRunRepository();
    mockLangflow = new MockLangflowProvider();
    mockEmail = new MockEmailProvider();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        SendInitialEmailUseCase,
        GetWorkflowContextUseCase,
        SideEffectService,
        SideEffectGuard,
        EmitWorkflowEventUseCase,
        EscalateWorkflowUseCase,
        LangflowRunRecorderService,
        {
          provide: POSTSALE_WORKFLOW_REPOSITORY,
          useValue: workflowRepository,
        },
        {
          provide: WORKFLOW_REQUIREMENT_REPOSITORY,
          useValue: requirementRepository,
        },
        {
          provide: OUTGOING_MESSAGE_REPOSITORY,
          useValue: outgoingRepository,
        },
        {
          provide: LANGFLOW_RUN_REPOSITORY,
          useValue: langflowRuns,
        },
        {
          provide: SIDE_EFFECT_RECORD_REPOSITORY,
          useValue: sideEffectRecords,
        },
        {
          provide: LANGFLOW_PROVIDER,
          useValue: mockLangflow,
        },
        {
          provide: EMAIL_PROVIDER,
          useValue: mockEmail,
        },
        {
          provide: AuditService,
          useValue: { emit: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    useCase = moduleFixture.get(SendInitialEmailUseCase);
  });

  it('baseline case 5: rejects send when requirements do not exist', async () => {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-1',
      status: WorkflowStatus.TEMPLATE_MATCHED,
    });

    const outcome = await useCase.execute({
      workflowId: workflow.id,
      recipientEmail: 'customer@example.com',
    });

    expect(outcome.type).toBe('rejected');
    if (outcome.type === 'rejected') {
      expect(outcome.reason).toBe('requirements_missing');
    }
    expect(mockEmail.sent).toHaveLength(0);
    expect(outgoingRepository.all()).toHaveLength(0);
  });

  it('sends initial email after requirements exist', async () => {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-2',
      status: WorkflowStatus.REQUIREMENTS_CREATED,
    });
    await requirementRepository.create({
      workflow_id: workflow.id,
      label: RequirementLabel.YES_NO_INFO,
      status: RequirementStatus.PENDING,
      source_note: 'Note',
      source_field: 'notes_front_3d',
      classification_reason: 'test',
      confidence: 0.9,
    });

    const outcome = await useCase.execute({
      workflowId: workflow.id,
      recipientEmail: 'customer@example.com',
    });

    expect(outcome.type).toBe('sent');
    if (outcome.type === 'sent') {
      expect(outcome.workflow.status).toBe(
        WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY,
      );
      expect(outcome.providerMessageId).toBe('msg-1');
    }
    expect(mockEmail.sent).toHaveLength(1);
    expect(mockEmail.sent[0]).toEqual({
      to: 'customer@example.com',
      subject: 'Test subject',
      body: 'Test body',
    });
    expect(outgoingRepository.all()).toHaveLength(1);
    expect(langflowRuns.all()).toHaveLength(1);
    expect(langflowRuns.all()[0]).toMatchObject({
      parsed_success: true,
      validation_errors: null,
      raw_output: null,
    });
  });

  it('rejects send when requirements step completed with zero rows (OD-015)', async () => {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-zero-reqs',
      status: WorkflowStatus.REQUIREMENTS_CREATED,
    });

    const outcome = await useCase.execute({
      workflowId: workflow.id,
      recipientEmail: 'customer@example.com',
    });

    expect(outcome.type).toBe('rejected');
    if (outcome.type === 'rejected') {
      expect(outcome.reason).toBe('requirements_missing');
    }
    expect(mockEmail.sent).toHaveLength(0);
  });

  it('records side_effect before email send', async () => {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-3',
      status: WorkflowStatus.REQUIREMENTS_CREATED,
    });
    await requirementRepository.create({
      workflow_id: workflow.id,
      label: RequirementLabel.TEXT_CONFIRMATION,
      status: RequirementStatus.PENDING,
      source_note: 'Note',
      source_field: 'notes_rear_3d',
      classification_reason: 'test',
      confidence: 0.95,
    });

    await useCase.execute({
      workflowId: workflow.id,
      recipientEmail: 'customer@example.com',
    });

    const record = await sideEffectRecords.findByIdempotencyKey(
      `${workflow.id}:send_initial_email`,
    );
    expect(record?.side_effect_type).toBe(SideEffectType.SEND_INITIAL_EMAIL);
    expect(record?.status).toBe(SideEffectRecordStatus.SUCCEEDED);
  });
});
