/**
 * V1 policy baseline cases 1–7 (task-09).
 * Format: Given / When / Then / Forbidden side effect
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../domains/audit/services/audit.service';
import { EmitWorkflowEventUseCase } from '../../domains/audit/use-cases/emit-workflow-event.use-case';
import { EscalateUnmatchedReplyUseCase } from '../../domains/email/use-cases/escalate-unmatched-reply.use-case';
import { IngestReplyUseCase } from '../../domains/email/use-cases/ingest-reply.use-case';
import {
  CUSTOMER_MESSAGE_REPOSITORY,
  MESSAGE_ATTACHMENT_REPOSITORY,
  MESSAGE_LINK_REPOSITORY,
  OUTGOING_MESSAGE_REPOSITORY,
} from '../../domains/email/repository/message.repository';
import { ReplyWorkflowMatcherService } from '../../domains/email/services/reply-workflow-matcher.service';
import { SendInitialEmailUseCase } from '../../domains/email/use-cases/send-initial-email.use-case';
import { IdempotencyService } from '../../domains/idempotency/services/idempotency.service';
import { CheckIdempotencyUseCase } from '../../domains/idempotency/use-cases/check-idempotency.use-case';
import { LANGFLOW_RUN_REPOSITORY } from '../../domains/langflow/repository/langflow-run.repository';
import { LangflowRunRecorderService } from '../../domains/langflow/services/langflow-run-recorder.service';
import { validateClassifications } from '../../domains/langflow/parsers/classification-validation';
import { EscalateWorkflowUseCase } from '../../domains/postsale-workflows/use-cases/escalate-workflow.use-case';
import { FailWorkflowUseCase } from '../../domains/postsale-workflows/use-cases/fail-workflow.use-case';
import { GetWorkflowContextUseCase } from '../../domains/postsale-workflows/use-cases/get-workflow-context.use-case';
import { LoadDealContextUseCase } from '../../domains/postsale-workflows/use-cases/load-deal-context.use-case';
import { MatchWorkflowTemplateUseCase } from '../../domains/postsale-workflows/use-cases/match-workflow-template.use-case';
import { StartWorkflowUseCase } from '../../domains/postsale-workflows/use-cases/start-workflow.use-case';
import { POSTSALE_WORKFLOW_REPOSITORY } from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import { AnalyzeReplyUseCase } from '../../domains/requirements/use-cases/analyze-reply.use-case';
import { REQUIREMENT_EVIDENCE_REPOSITORY } from '../../domains/requirements/repository/requirement-evidence.repository';
import { WORKFLOW_REQUIREMENT_REPOSITORY } from '../../domains/requirements/repository/workflow-requirement.repository';
import { CarTemplateRepository } from '../../domains/template-matching/repository/car-template.repository.port';
import { TemplateMatchingService } from '../../domains/template-matching/services/template-matching.service';
import { TemplateNoteSelectionService } from '../../domains/template-matching/services/template-note-selection.service';
import { BITRIX_PROVIDER } from '../../integrations/bitrix/bitrix.provider';
import { EMAIL_PROVIDER } from '../../integrations/email/email.provider';
import { LANGFLOW_PROVIDER } from '../../integrations/langflow/langflow.provider';
import { MockBitrixProvider } from '../../integrations/bitrix/mock-bitrix.provider';
import { IDEMPOTENCY_REPOSITORY } from '../../domains/idempotency/repository/idempotency.repository';
import {
  MessageDirection,
  RequirementLabel,
  RequirementStatus,
  SideEffectRecordStatus,
  TemplateMatchStatus,
  WorkflowStatus,
} from '../../lib/enums';
import {
  buildBitrixDealFields,
  buildPersistedDealContext,
  seedMockBitrixDeal,
} from '../helpers/bitrix-deal-fields';
import {
  buildAcuraMdxTemplate,
  InMemoryCarTemplateRepository,
} from '../helpers/in-memory-car-template.repository';
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
import {
  CreateSideEffectRecordInput,
  SIDE_EFFECT_RECORD_REPOSITORY,
  SideEffectRecordRepository,
} from '../../domains/side-effects/repository/side-effect-record.repository';
import { SideEffectGuard } from '../../domains/side-effects/guards/side-effect.guard';
import { SideEffectService } from '../../domains/side-effects/services/side-effect.service';
import { SideEffectRecordRow } from '../../lib/persistence';

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

describe('Policy baseline cases 1–7', () => {
  describe('case 1: duplicate Bitrix trigger → no second workflow', () => {
    let startWorkflow: StartWorkflowUseCase;
    let workflowRepository: InMemoryPostsaleWorkflowRepository;
    let bitrixProvider: MockBitrixProvider;

    beforeEach(async () => {
      workflowRepository = new InMemoryPostsaleWorkflowRepository();
      bitrixProvider = new MockBitrixProvider();
      const carTemplateRepository = new InMemoryCarTemplateRepository();
      const moduleFixture: TestingModule = await Test.createTestingModule({
        providers: [
          StartWorkflowUseCase,
          LoadDealContextUseCase,
          MatchWorkflowTemplateUseCase,
          TemplateMatchingService,
          TemplateNoteSelectionService,
          EscalateWorkflowUseCase,
          FailWorkflowUseCase,
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
          { provide: BITRIX_PROVIDER, useValue: bitrixProvider },
          {
            provide: AuditService,
            useValue: { emit: jest.fn().mockResolvedValue({}) },
          },
          { provide: CarTemplateRepository, useValue: carTemplateRepository },
        ],
      }).compile();
      startWorkflow = moduleFixture.get(StartWorkflowUseCase);
      seedMockBitrixDeal(bitrixProvider, 'deal-1', buildBitrixDealFields());
    });

    it('Given duplicate idempotency key When start twice Then one workflow only', async () => {
      const command = {
        bitrixDealId: 'deal-1',
        idempotencyKey: 'deal-1-start',
      };
      const first = await startWorkflow.execute(command);
      const second = await startWorkflow.execute(command);

      expect(first.isDuplicate).toBe(false);
      expect(second.isDuplicate).toBe(true);
      expect(workflowRepository.count()).toBe(1);
    });
  });

  describe('case 2: template not found → escalate', () => {
    it('Given no matching template When start workflow Then ESCALATED NOT_FOUND', async () => {
      const workflowRepository = new InMemoryPostsaleWorkflowRepository();
      const bitrixProvider = new MockBitrixProvider();
      seedMockBitrixDeal(bitrixProvider, 'deal-2', buildBitrixDealFields());
      const moduleFixture = await Test.createTestingModule({
        providers: [
          StartWorkflowUseCase,
          LoadDealContextUseCase,
          MatchWorkflowTemplateUseCase,
          TemplateMatchingService,
          TemplateNoteSelectionService,
          EscalateWorkflowUseCase,
          FailWorkflowUseCase,
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
          { provide: BITRIX_PROVIDER, useValue: bitrixProvider },
          {
            provide: AuditService,
            useValue: { emit: jest.fn().mockResolvedValue({}) },
          },
          {
            provide: CarTemplateRepository,
            useValue: new InMemoryCarTemplateRepository(),
          },
        ],
      }).compile();
      const startWorkflow = moduleFixture.get(StartWorkflowUseCase);
      const result = await startWorkflow.execute({
        bitrixDealId: 'deal-2',
        idempotencyKey: 'deal-2-start',
      });
      expect(result.status).toBe(WorkflowStatus.ESCALATED);
      expect(result.templateMatchStatus).toBe(TemplateMatchStatus.NOT_FOUND);
    });
  });

  describe('case 3: ambiguous template → escalate', () => {
    it('Given multiple template matches When match Then AMBIGUOUS', async () => {
      const repository = new InMemoryCarTemplateRepository();
      repository.seed(
        buildAcuraMdxTemplate({ id: 'a' }),
        buildAcuraMdxTemplate({ id: 'b' }),
      );
      const moduleFixture = await Test.createTestingModule({
        providers: [
          TemplateMatchingService,
          { provide: CarTemplateRepository, useValue: repository },
        ],
      }).compile();
      const service = moduleFixture.get(TemplateMatchingService);
      const result = await service.matchDealContext(
        buildPersistedDealContext('deal-3', {
          brand: 'Acura',
          model: 'MDX 2 gen',
          bodyType: 'SUV 7 osobowy',
          generation: '2006-2013',
        }),
      );
      expect(result.status).toBe('AMBIGUOUS');
    });
  });

  describe('case 4: unsafe Langflow notes → escalate', () => {
    it('Given unsafe_notes When validate Then reject before persistence', () => {
      const result = validateClassifications([], ['internal secret note']);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('unsafe_notes');
      }
    });
  });

  describe('case 5: no initial email before requirements', () => {
    it('Given workflow without requirements When send initial Then rejected, no email', async () => {
      const workflowRepository = new InMemoryPostsaleWorkflowRepository();
      const mockEmail = new MockEmailProvider();
      const moduleFixture = await Test.createTestingModule({
        providers: [
          SendInitialEmailUseCase,
          GetWorkflowContextUseCase,
          EscalateWorkflowUseCase,
          EmitWorkflowEventUseCase,
          SideEffectService,
          SideEffectGuard,
          LangflowRunRecorderService,
          {
            provide: POSTSALE_WORKFLOW_REPOSITORY,
            useValue: workflowRepository,
          },
          {
            provide: WORKFLOW_REQUIREMENT_REPOSITORY,
            useValue: new InMemoryWorkflowRequirementRepository(),
          },
          {
            provide: OUTGOING_MESSAGE_REPOSITORY,
            useValue: new InMemoryOutgoingMessageRepository(),
          },
          {
            provide: LANGFLOW_RUN_REPOSITORY,
            useValue: new InMemoryLangflowRunRepository(),
          },
          {
            provide: SIDE_EFFECT_RECORD_REPOSITORY,
            useClass: InMemorySideEffectRecordRepository,
          },
          { provide: LANGFLOW_PROVIDER, useValue: new MockLangflowProvider() },
          { provide: EMAIL_PROVIDER, useValue: mockEmail },
          {
            provide: AuditService,
            useValue: { emit: jest.fn().mockResolvedValue({}) },
          },
        ],
      }).compile();
      const workflow = await workflowRepository.create({
        bitrixDealId: 'deal-5',
        status: WorkflowStatus.TEMPLATE_MATCHED,
      });
      const sendInitial = moduleFixture.get(SendInitialEmailUseCase);
      const outcome = await sendInitial.execute({ workflowId: workflow.id });
      expect(outcome.type).toBe('rejected');
      expect(mockEmail.sent).toHaveLength(0);
    });
  });

  describe('case 6: unmatched reply → escalate', () => {
    it('Given reply with no workflow match When ingest Then escalated_unmatched', async () => {
      const moduleFixture = await Test.createTestingModule({
        providers: [
          IngestReplyUseCase,
          ReplyWorkflowMatcherService,
          GetWorkflowContextUseCase,
          EscalateWorkflowUseCase,
          EscalateUnmatchedReplyUseCase,
          IdempotencyService,
          CheckIdempotencyUseCase,
          {
            provide: IDEMPOTENCY_REPOSITORY,
            useValue: new InMemoryIdempotencyRepository(),
          },
          {
            provide: EmitWorkflowEventUseCase,
            useValue: { execute: jest.fn().mockResolvedValue({}) },
          },
          {
            provide: POSTSALE_WORKFLOW_REPOSITORY,
            useValue: new InMemoryPostsaleWorkflowRepository(),
          },
          {
            provide: OUTGOING_MESSAGE_REPOSITORY,
            useValue: new InMemoryOutgoingMessageRepository(),
          },
          {
            provide: CUSTOMER_MESSAGE_REPOSITORY,
            useValue: new InMemoryCustomerMessageRepository(),
          },
          {
            provide: MESSAGE_ATTACHMENT_REPOSITORY,
            useValue: new InMemoryMessageAttachmentRepository(),
          },
          {
            provide: MESSAGE_LINK_REPOSITORY,
            useValue: new InMemoryMessageLinkRepository(),
          },
        ],
      }).compile();
      const ingest = moduleFixture.get(IngestReplyUseCase);
      const outcome = await ingest.execute({
        messageId: 'msg-unknown',
        threadId: 'thread-unknown',
        inReplyTo: 'missing',
        fromEmail: 'c@example.com',
        fromName: null,
        toEmails: ['sales@evapremium.com'],
        subject: 'Re:',
        bodyText: 'hello',
        bodyHtml: null,
        receivedAt: new Date().toISOString(),
        attachments: [],
      });
      expect(outcome.type).toBe('escalated_unmatched');
    });
  });

  describe('case 7: VALID without evidence rejected', () => {
    it('Given Langflow proposes VALID without evidence When analyze Then rejected', async () => {
      const workflowRepository = new InMemoryPostsaleWorkflowRepository();
      const requirementRepository = new InMemoryWorkflowRequirementRepository();
      const mockLangflow = new MockLangflowProvider();
      const workflow = await workflowRepository.create({
        bitrixDealId: 'deal-7',
        status: WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY,
      });
      const req = await requirementRepository.create({
        workflow_id: workflow.id,
        label: RequirementLabel.YES_NO_INFO,
        status: RequirementStatus.PENDING,
        source_note: 'n',
        source_field: 'notes_front_3d',
        classification_reason: 't',
        confidence: 0.9,
      });
      const customerMessageRepository = new InMemoryCustomerMessageRepository();
      const message = await customerMessageRepository.create({
        workflow_id: workflow.id,
        direction: MessageDirection.INBOUND,
        subject: 'Re:',
        body: 'yes',
        from_address: 'c@example.com',
        to_address: 'sales@evapremium.com',
        external_message_id: 'ext-7',
      });
      mockLangflow.analyzeReplyHandler = () => ({
        requirement_updates: [
          {
            requirement_id: req.id,
            proposed_status: RequirementStatus.VALID,
            evidence_proposals: [],
            confidence: 0.95,
            analysis_reason: 'x',
          },
        ],
        unsafe: false,
        proposed_next_action: 'COMPLETE',
      });
      const moduleFixture = await Test.createTestingModule({
        providers: [
          AnalyzeReplyUseCase,
          GetWorkflowContextUseCase,
          EscalateWorkflowUseCase,
          LangflowRunRecorderService,
          {
            provide: EmitWorkflowEventUseCase,
            useValue: { execute: jest.fn().mockResolvedValue({}) },
          },
          {
            provide: POSTSALE_WORKFLOW_REPOSITORY,
            useValue: workflowRepository,
          },
          {
            provide: WORKFLOW_REQUIREMENT_REPOSITORY,
            useValue: requirementRepository,
          },
          {
            provide: CUSTOMER_MESSAGE_REPOSITORY,
            useValue: customerMessageRepository,
          },
          {
            provide: MESSAGE_ATTACHMENT_REPOSITORY,
            useValue: new InMemoryMessageAttachmentRepository(),
          },
          {
            provide: MESSAGE_LINK_REPOSITORY,
            useValue: new InMemoryMessageLinkRepository(),
          },
          {
            provide: REQUIREMENT_EVIDENCE_REPOSITORY,
            useValue: new InMemoryRequirementEvidenceRepository(),
          },
          {
            provide: LANGFLOW_RUN_REPOSITORY,
            useValue: new InMemoryLangflowRunRepository(),
          },
          { provide: LANGFLOW_PROVIDER, useValue: mockLangflow },
        ],
      }).compile();
      const analyze = moduleFixture.get(AnalyzeReplyUseCase);
      const outcome = await analyze.execute({
        workflowId: workflow.id,
        customerMessageId: message.id,
      });
      expect(outcome.type).toBe('rejected');
      if (outcome.type === 'rejected') {
        expect(outcome.reason).toBe('valid_without_evidence');
      }
    });
  });
});
