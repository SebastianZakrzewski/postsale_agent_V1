import { Test, TestingModule } from '@nestjs/testing';
import { EmitWorkflowEventUseCase } from '../../domains/audit/use-cases/emit-workflow-event.use-case';
import {
  CUSTOMER_MESSAGE_REPOSITORY,
  MESSAGE_ATTACHMENT_REPOSITORY,
  MESSAGE_LINK_REPOSITORY,
} from '../../domains/email/repository/message.repository';
import { LANGFLOW_RUN_REPOSITORY } from '../../domains/langflow/repository/langflow-run.repository';
import { LangflowRunRecorderService } from '../../domains/langflow/services/langflow-run-recorder.service';
import { AnalyzeReplyUseCase } from '../../domains/requirements/use-cases/analyze-reply.use-case';
import { REQUIREMENT_EVIDENCE_REPOSITORY } from '../../domains/requirements/repository/requirement-evidence.repository';
import { WORKFLOW_REQUIREMENT_REPOSITORY } from '../../domains/requirements/repository/workflow-requirement.repository';
import { GetWorkflowContextUseCase } from '../../domains/postsale-workflows/use-cases/get-workflow-context.use-case';
import { POSTSALE_WORKFLOW_REPOSITORY } from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import { gatedEscalationTestProviders } from '../helpers/gated-escalation-test.providers';
import { LANGFLOW_PROVIDER } from '../../integrations/langflow/langflow.provider';
import {
  EvidenceType,
  MessageDirection,
  RequirementLabel,
  RequirementStatus,
  WorkflowStatus,
} from '../../lib/enums';
import { InMemoryCustomerMessageRepository } from '../helpers/in-memory-customer-message.repository';
import { InMemoryLangflowRunRepository } from '../helpers/in-memory-langflow-run.repository';
import { InMemoryMessageAttachmentRepository } from '../helpers/in-memory-message-attachment.repository';
import { InMemoryMessageLinkRepository } from '../helpers/in-memory-message-link.repository';
import { InMemoryPostsaleWorkflowRepository } from '../helpers/in-memory-postsale-workflow.repository';
import { InMemoryRequirementEvidenceRepository } from '../helpers/in-memory-requirement-evidence.repository';
import { InMemoryWorkflowRequirementRepository } from '../helpers/in-memory-workflow-requirement.repository';
import { MockLangflowProvider } from '../helpers/mock-langflow.provider';

describe('AnalyzeReplyUseCase', () => {
  let useCase: AnalyzeReplyUseCase;
  let workflowRepository: InMemoryPostsaleWorkflowRepository;
  let requirementRepository: InMemoryWorkflowRequirementRepository;
  let customerMessageRepository: InMemoryCustomerMessageRepository;
  let evidenceRepository: InMemoryRequirementEvidenceRepository;
  let mockLangflow: MockLangflowProvider;

  beforeEach(async () => {
    workflowRepository = new InMemoryPostsaleWorkflowRepository();
    requirementRepository = new InMemoryWorkflowRequirementRepository();
    customerMessageRepository = new InMemoryCustomerMessageRepository();
    evidenceRepository = new InMemoryRequirementEvidenceRepository();
    mockLangflow = new MockLangflowProvider();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyzeReplyUseCase,
        GetWorkflowContextUseCase,
        ...gatedEscalationTestProviders,
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
          useValue: evidenceRepository,
        },
        {
          provide: LANGFLOW_PROVIDER,
          useValue: mockLangflow,
        },
        {
          provide: LANGFLOW_RUN_REPOSITORY,
          useValue: new InMemoryLangflowRunRepository(),
        },
      ],
    }).compile();

    useCase = moduleFixture.get(AnalyzeReplyUseCase);
  });

  async function seedWorkflowWithMessage() {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-1',
      status: WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY,
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
      body: 'Yes for first only',
      from_address: 'customer@example.com',
      to_address: 'sales@evapremium.com',
      external_message_id: 'gmail-1',
    });

    return { workflow, req1, req2, message };
  }

  it('baseline case 7: rejects VALID without evidence proposals', async () => {
    const { workflow, req1, message } = await seedWorkflowWithMessage();

    mockLangflow.analyzeReplyHandler = () => ({
      requirement_updates: [
        {
          requirement_id: req1.id,
          proposed_status: RequirementStatus.VALID,
          evidence_proposals: [],
          confidence: 0.95,
          analysis_reason: 'looks valid',
        },
      ],
      unsafe: false,
      proposed_next_action: 'COMPLETE',
    });

    const outcome = await useCase.execute({
      workflowId: workflow.id,
      customerMessageId: message.id,
    });

    expect(outcome.type).toBe('rejected');
    if (outcome.type === 'rejected') {
      expect(outcome.reason).toBe('valid_without_evidence');
    }
    expect(evidenceRepository.all()).toHaveLength(0);
    const updated = await requirementRepository.findById(req1.id);
    expect(updated?.status).toBe(RequirementStatus.PENDING);
  });

  it('partial reply leaves non-updated requirements non-VALID', async () => {
    const { workflow, req1, req2, message } = await seedWorkflowWithMessage();

    mockLangflow.analyzeReplyHandler = () => ({
      requirement_updates: [
        {
          requirement_id: req1.id,
          proposed_status: RequirementStatus.VALID,
          evidence_proposals: [
            {
              evidence_type: EvidenceType.TEXT_FRAGMENT,
              source_ref: null,
              content: 'yes confirmed',
            },
          ],
          confidence: 0.95,
          analysis_reason: 'answered',
        },
      ],
      unsafe: false,
      proposed_next_action: 'FOLLOWUP',
    });

    const outcome = await useCase.execute({
      workflowId: workflow.id,
      customerMessageId: message.id,
    });

    expect(outcome.type).toBe('analyzed');
    const updatedReq1 = await requirementRepository.findById(req1.id);
    const updatedReq2 = await requirementRepository.findById(req2.id);
    expect(updatedReq1?.status).toBe(RequirementStatus.VALID);
    expect(updatedReq2?.status).toBe(RequirementStatus.PENDING);
    expect(evidenceRepository.all()).toHaveLength(1);
    const refreshed = await workflowRepository.findById(workflow.id);
    expect(refreshed?.status).toBe(WorkflowStatus.REQUIREMENTS_UPDATED);
  });
});
