import { Test, TestingModule } from '@nestjs/testing';
import { EmitWorkflowEventUseCase } from '../../domains/audit/use-cases/emit-workflow-event.use-case';
import {
  CUSTOMER_MESSAGE_REPOSITORY,
  MESSAGE_ATTACHMENT_REPOSITORY,
  MESSAGE_LINK_REPOSITORY,
} from '../../domains/email/repository/message.repository';
import { LANGFLOW_RUN_REPOSITORY } from '../../domains/langflow/repository/langflow-run.repository';
import { LangflowRunRecorderService } from '../../domains/langflow/services/langflow-run-recorder.service';
import { ApplyCompletionPolicyUseCase } from '../../domains/postsale-workflows/use-cases/apply-completion-policy.use-case';
import { EscalateWorkflowUseCase } from '../../domains/postsale-workflows/use-cases/escalate-workflow.use-case';
import { GetWorkflowContextUseCase } from '../../domains/postsale-workflows/use-cases/get-workflow-context.use-case';
import { POSTSALE_WORKFLOW_REPOSITORY } from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import { PolicyContextBuilderService } from '../../domains/postsale-workflows/services/policy-context-builder.service';
import {
  CreateSideEffectRecordInput,
  SIDE_EFFECT_RECORD_REPOSITORY,
  SideEffectRecordRepository,
} from '../../domains/side-effects/repository/side-effect-record.repository';
import { SideEffectService } from '../../domains/side-effects/services/side-effect.service';
import { AnalyzeReplyUseCase } from '../../domains/requirements/use-cases/analyze-reply.use-case';
import { REQUIREMENT_EVIDENCE_REPOSITORY } from '../../domains/requirements/repository/requirement-evidence.repository';
import { WORKFLOW_REQUIREMENT_REPOSITORY } from '../../domains/requirements/repository/workflow-requirement.repository';
import { LANGFLOW_PROVIDER } from '../../integrations/langflow/langflow.provider';
import {
  EvidenceType,
  MessageDirection,
  RequirementLabel,
  RequirementStatus,
  SideEffectRecordStatus,
  TemplateMatchStatus,
  WorkflowStatus,
} from '../../lib/enums';
import { SideEffectRecordRow } from '../../lib/persistence';
import { InMemoryCustomerMessageRepository } from '../helpers/in-memory-customer-message.repository';
import { InMemoryLangflowRunRepository } from '../helpers/in-memory-langflow-run.repository';
import { InMemoryMessageAttachmentRepository } from '../helpers/in-memory-message-attachment.repository';
import { InMemoryMessageLinkRepository } from '../helpers/in-memory-message-link.repository';
import { InMemoryPostsaleWorkflowRepository } from '../helpers/in-memory-postsale-workflow.repository';
import { InMemoryRequirementEvidenceRepository } from '../helpers/in-memory-requirement-evidence.repository';
import { InMemoryWorkflowRequirementRepository } from '../helpers/in-memory-workflow-requirement.repository';
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

  async updateStatus(): Promise<void> {}
}

/**
 * task-07: Langflow propose_completion cannot bypass CompletionPolicy.
 */
describe('propose_completion policy integration (task-07)', () => {
  let analyzeReply: AnalyzeReplyUseCase;
  let applyCompletionPolicy: ApplyCompletionPolicyUseCase;
  let workflowRepository: InMemoryPostsaleWorkflowRepository;
  let requirementRepository: InMemoryWorkflowRequirementRepository;
  let customerMessageRepository: InMemoryCustomerMessageRepository;
  let mockLangflow: MockLangflowProvider;

  beforeEach(async () => {
    workflowRepository = new InMemoryPostsaleWorkflowRepository();
    requirementRepository = new InMemoryWorkflowRequirementRepository();
    customerMessageRepository = new InMemoryCustomerMessageRepository();
    mockLangflow = new MockLangflowProvider();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyzeReplyUseCase,
        ApplyCompletionPolicyUseCase,
        GetWorkflowContextUseCase,
        PolicyContextBuilderService,
        SideEffectService,
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
          provide: SIDE_EFFECT_RECORD_REPOSITORY,
          useClass: InMemorySideEffectRecordRepository,
        },
        {
          provide: LANGFLOW_RUN_REPOSITORY,
          useValue: new InMemoryLangflowRunRepository(),
        },
        { provide: LANGFLOW_PROVIDER, useValue: mockLangflow },
      ],
    }).compile();

    analyzeReply = moduleFixture.get(AnalyzeReplyUseCase);
    applyCompletionPolicy = moduleFixture.get(ApplyCompletionPolicyUseCase);
  });

  it('Given Langflow proposes COMPLETE When requirements still incomplete Then policy blocks completion', async () => {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-propose-complete',
      status: WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY,
    });
    await workflowRepository.updateTemplateMatch(workflow.id, {
      templateMatchStatus: TemplateMatchStatus.MATCHED,
      status: WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY,
      carTemplateId: 'tpl-1',
    });

    const req1 = await requirementRepository.create({
      workflow_id: workflow.id,
      label: RequirementLabel.YES_NO_INFO,
      status: RequirementStatus.PENDING,
      source_note: 'note-1',
      source_field: 'notes_front_3d',
      classification_reason: 'test',
      confidence: 0.9,
    });
    const req2 = await requirementRepository.create({
      workflow_id: workflow.id,
      label: RequirementLabel.TEXT_CONFIRMATION,
      status: RequirementStatus.PENDING,
      source_note: 'note-2',
      source_field: 'notes_rear_3d',
      classification_reason: 'test',
      confidence: 0.9,
    });

    const message = await customerMessageRepository.create({
      workflow_id: workflow.id,
      direction: MessageDirection.INBOUND,
      subject: 'Re:',
      body: 'partial answer',
      from_address: 'customer@example.com',
      to_address: 'sales@evapremium.com',
      external_message_id: 'ext-propose-1',
    });

    mockLangflow.analyzeReplyHandler = () => ({
      requirement_updates: [
        {
          requirement_id: req1.id,
          proposed_status: RequirementStatus.VALID,
          evidence_proposals: [
            {
              evidence_type: EvidenceType.TEXT_FRAGMENT,
              source_ref: null,
              content: 'confirmed',
            },
          ],
          confidence: 0.95,
          analysis_reason: 'answered',
        },
      ],
      unsafe: false,
      proposed_next_action: 'COMPLETE',
    });

    const analyzeOutcome = await analyzeReply.execute({
      workflowId: workflow.id,
      customerMessageId: message.id,
    });

    expect(analyzeOutcome.type).toBe('analyzed');
    if (analyzeOutcome.type === 'analyzed') {
      expect(analyzeOutcome.proposedNextAction).toBe('COMPLETE');
      expect(analyzeOutcome.capability.allowedNextActions).toContain(
        'propose_completion',
      );
    }

    const afterAnalyze = await workflowRepository.findById(workflow.id);
    expect(afterAnalyze?.status).toBe(WorkflowStatus.REQUIREMENTS_UPDATED);

    const stillPending = await requirementRepository.findById(req2.id);
    expect(stillPending?.status).toBe(RequirementStatus.PENDING);

    const policyOutcome = await applyCompletionPolicy.execute({
      workflowId: workflow.id,
    });

    expect(policyOutcome.type).toBe('incomplete');
    const refreshed = await workflowRepository.findById(workflow.id);
    expect(refreshed?.status).not.toBe(
      WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE,
    );
    expect(refreshed?.status).not.toBe(WorkflowStatus.COMPLETED);
  });
});
