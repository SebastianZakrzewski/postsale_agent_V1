import { Test, TestingModule } from '@nestjs/testing';
import { EmitWorkflowEventUseCase } from '../../domains/audit/use-cases/emit-workflow-event.use-case';
import { ApplyCompletionPolicyUseCase } from '../../domains/postsale-workflows/use-cases/apply-completion-policy.use-case';
import { EscalateToPendingBitrixUseCase } from '../../domains/postsale-workflows/use-cases/escalate-to-pending-bitrix.use-case';
import { ExecutePendingSideEffectsUseCase } from '../../domains/postsale-workflows/use-cases/execute-pending-side-effects.use-case';
import { GetWorkflowContextUseCase } from '../../domains/postsale-workflows/use-cases/get-workflow-context.use-case';
import { ProcessFollowupCheckUseCase } from '../../domains/postsale-workflows/use-cases/process-followup-check.use-case';
import { SendFollowupUseCase } from '../../domains/postsale-workflows/use-cases/send-followup.use-case';
import { POSTSALE_WORKFLOW_REPOSITORY } from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import { PolicyContextBuilderService } from '../../domains/postsale-workflows/services/policy-context-builder.service';
import { REQUIREMENT_EVIDENCE_REPOSITORY } from '../../domains/requirements/repository/requirement-evidence.repository';
import { WORKFLOW_REQUIREMENT_REPOSITORY } from '../../domains/requirements/repository/workflow-requirement.repository';
import { SideEffectGuard } from '../../domains/side-effects/guards/side-effect.guard';
import { SideEffectService } from '../../domains/side-effects/services/side-effect.service';
import {
  CreateSideEffectRecordInput,
  SIDE_EFFECT_RECORD_REPOSITORY,
  SideEffectRecordRepository,
} from '../../domains/side-effects/repository/side-effect-record.repository';
import { BITRIX_PROVIDER } from '../../integrations/bitrix/bitrix.provider';
import { TELEGRAM_PROVIDER } from '../../integrations/telegram/telegram.provider';
import { MockBitrixProvider } from '../../integrations/bitrix/mock-bitrix.provider';
import {
  EvidenceType,
  RequirementLabel,
  RequirementStatus,
  SideEffectRecordStatus,
  TemplateMatchStatus,
  WorkflowStatus,
} from '../../lib/enums';
import { SideEffectRecordRow } from '../../lib/persistence';
import { buildPersistedDealContext } from '../helpers/bitrix-deal-fields';
import { InMemoryPostsaleWorkflowRepository } from '../helpers/in-memory-postsale-workflow.repository';
import { InMemoryRequirementEvidenceRepository } from '../helpers/in-memory-requirement-evidence.repository';
import { InMemoryWorkflowRequirementRepository } from '../helpers/in-memory-workflow-requirement.repository';
import { MockTelegramProvider } from '../helpers/mock-telegram.provider';

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
      }
    }
  }
}

describe('ProcessFollowupCheckUseCase', () => {
  let useCase: ProcessFollowupCheckUseCase;
  let workflowRepository: InMemoryPostsaleWorkflowRepository;
  let requirementRepository: InMemoryWorkflowRequirementRepository;
  let evidenceRepository: InMemoryRequirementEvidenceRepository;
  let bitrixProvider: MockBitrixProvider;

  beforeEach(async () => {
    process.env.BITRIX_STAGE_COMPLETED = 'UC_ZQ68O2';
    workflowRepository = new InMemoryPostsaleWorkflowRepository();
    requirementRepository = new InMemoryWorkflowRequirementRepository();
    evidenceRepository = new InMemoryRequirementEvidenceRepository();
    bitrixProvider = new MockBitrixProvider();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessFollowupCheckUseCase,
        GetWorkflowContextUseCase,
        PolicyContextBuilderService,
        ApplyCompletionPolicyUseCase,
        ExecutePendingSideEffectsUseCase,
        SideEffectService,
        SideEffectGuard,
        {
          provide: SendFollowupUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: EscalateToPendingBitrixUseCase,
          useValue: { execute: jest.fn() },
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
          provide: REQUIREMENT_EVIDENCE_REPOSITORY,
          useValue: evidenceRepository,
        },
        {
          provide: SIDE_EFFECT_RECORD_REPOSITORY,
          useClass: InMemorySideEffectRecordRepository,
        },
        {
          provide: BITRIX_PROVIDER,
          useValue: bitrixProvider,
        },
        {
          provide: TELEGRAM_PROVIDER,
          useValue: new MockTelegramProvider(),
        },
        {
          provide: EmitWorkflowEventUseCase,
          useValue: { execute: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    useCase = moduleFixture.get(ProcessFollowupCheckUseCase);
  });

  it('returns pending Bitrix status when completion side effects are blocked', async () => {
    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-1',
      status: WorkflowStatus.REQUIREMENTS_UPDATED,
    });
    await workflowRepository.updateDealContext(workflow.id, {
      dealContext: buildPersistedDealContext('deal-1'),
      product: 'Komplet Classic',
      status: WorkflowStatus.REQUIREMENTS_UPDATED,
    });
    await workflowRepository.updateTemplateMatch(workflow.id, {
      templateMatchStatus: TemplateMatchStatus.MATCHED,
      status: WorkflowStatus.REQUIREMENTS_UPDATED,
      carTemplateId: 'tpl-1',
    });
    const req = await requirementRepository.create({
      workflow_id: workflow.id,
      label: RequirementLabel.YES_NO_INFO,
      status: RequirementStatus.VALID,
      source_note: 'note-1',
      source_field: 'notes_front_3d',
      classification_reason: 'test',
      confidence: 0.9,
    });
    await evidenceRepository.createMany([
      {
        requirement_id: req.id,
        workflow_id: workflow.id,
        evidence_type: EvidenceType.TEXT_FRAGMENT,
        source_ref: null,
        content: 'confirmed',
      },
    ]);
    bitrixProvider.setDeal('deal-1', { id: 'deal-1', fields: {} });
    bitrixProvider.setStageUpdateFailure('Bitrix unavailable');

    const result = await useCase.execute({ workflowId: workflow.id });

    expect(result.type).toBe('waiting');
    if (result.type === 'waiting') {
      expect(result.status).toBe(
        WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE,
      );
      expect(result.reason).toBe('bitrix_update_failed');
    }
  });
});
