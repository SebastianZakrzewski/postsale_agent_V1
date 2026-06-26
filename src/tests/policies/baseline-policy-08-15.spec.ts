/**
 * V1 policy baseline cases 8–15 (task-09).
 */
import { Test } from '@nestjs/testing';
import { EmitWorkflowEventUseCase } from '../../domains/audit/use-cases/emit-workflow-event.use-case';
import { validateClassifications } from '../../domains/langflow/parsers/classification-validation';
import { ApplyCompletionPolicyUseCase } from '../../domains/postsale-workflows/use-cases/apply-completion-policy.use-case';
import { ExecutePendingSideEffectsUseCase } from '../../domains/postsale-workflows/use-cases/execute-pending-side-effects.use-case';
import { GetWorkflowContextUseCase } from '../../domains/postsale-workflows/use-cases/get-workflow-context.use-case';
import { PolicyContextBuilderService } from '../../domains/postsale-workflows/services/policy-context-builder.service';
import { POSTSALE_WORKFLOW_REPOSITORY } from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import { REQUIREMENT_EVIDENCE_REPOSITORY } from '../../domains/requirements/repository/requirement-evidence.repository';
import { WORKFLOW_REQUIREMENT_REPOSITORY } from '../../domains/requirements/repository/workflow-requirement.repository';
import { SideEffectGuard } from '../../domains/side-effects/guards/side-effect.guard';
import { SideEffectService } from '../../domains/side-effects/services/side-effect.service';
import {
  CreateSideEffectRecordInput,
  SIDE_EFFECT_RECORD_REPOSITORY,
  SideEffectRecordRepository,
} from '../../domains/side-effects/repository/side-effect-record.repository';
import { evaluateCompletionPolicy } from '../../domains/postsale-workflows/policies/completion.policy';
import {
  evaluateFollowupPolicy,
  FOLLOWUP_POLICY_MAX_ATTEMPTS,
} from '../../domains/postsale-workflows/policies/followup.policy';
import { BITRIX_PROVIDER } from '../../integrations/bitrix/bitrix.provider';
import { TELEGRAM_PROVIDER } from '../../integrations/telegram/telegram.provider';
import { MockBitrixProvider } from '../../integrations/bitrix/mock-bitrix.provider';
import { HttpLangflowAdapter } from '../../integrations/langflow/langflow.adapter';
import {
  RequirementLabel,
  RequirementStatus,
  SideEffectRecordStatus,
  TemplateMatchStatus,
  WorkflowStatus,
} from '../../lib/enums';
import {
  WorkflowRequirementRow,
  SideEffectRecordRow,
} from '../../lib/persistence';
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

function requirement(
  overrides: Partial<WorkflowRequirementRow> = {},
): WorkflowRequirementRow {
  return {
    id: overrides.id ?? 'req-1',
    workflow_id: overrides.workflow_id ?? 'wf-1',
    label: overrides.label ?? RequirementLabel.YES_NO_INFO,
    status: overrides.status ?? RequirementStatus.PENDING,
    source_note: overrides.source_note ?? 'note',
    source_field: overrides.source_field ?? 'notes_front_3d',
    classification_reason: overrides.classification_reason ?? null,
    confidence: overrides.confidence ?? 0.9,
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
  };
}

describe('Policy baseline cases 8–15', () => {
  const baseWorkflow = {
    id: 'wf-1',
    bitrixDealId: 'deal-1',
    status: WorkflowStatus.REQUIREMENTS_UPDATED,
    templateMatchStatus: TemplateMatchStatus.MATCHED,
    dealContext: buildPersistedDealContext('deal-1'),
    product: '3D EVAPREMIUM Z RANTAMI',
    carTemplateId: 'tpl-1',
    followUpCount: 0,
    lastFollowUpAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('case 8: incomplete requirements → no complete', () => {
    it('Given PENDING requirement When CompletionPolicy Then INCOMPLETE', () => {
      const result = evaluateCompletionPolicy({
        workflow: baseWorkflow,
        requirements: [requirement({ status: RequirementStatus.PENDING })],
        evidenceCountByRequirementId: new Map(),
        langflowAnalysisValid: true,
        bitrixCompletionSideEffectSucceeded: false,
      });
      expect(result.outcome).toBe('INCOMPLETE');
    });

    it('Given incomplete workflow When ApplyCompletionPolicy Then not COMPLETION_PENDING', async () => {
      const workflowRepository = new InMemoryPostsaleWorkflowRepository();
      const requirementRepository = new InMemoryWorkflowRequirementRepository();
      const evidenceRepository = new InMemoryRequirementEvidenceRepository();
      const workflow = await workflowRepository.create({
        bitrixDealId: 'deal-8',
        status: WorkflowStatus.REQUIREMENTS_UPDATED,
      });
      await workflowRepository.updateTemplateMatch(workflow.id, {
        templateMatchStatus: TemplateMatchStatus.MATCHED,
        status: WorkflowStatus.REQUIREMENTS_UPDATED,
        carTemplateId: 'tpl-1',
      });
      await requirementRepository.create({
        workflow_id: workflow.id,
        label: RequirementLabel.YES_NO_INFO,
        status: RequirementStatus.PENDING,
        source_note: 'n',
        source_field: 'notes_front_3d',
        classification_reason: 't',
        confidence: 0.9,
      });
      const moduleFixture = await Test.createTestingModule({
        providers: [
          ApplyCompletionPolicyUseCase,
          GetWorkflowContextUseCase,
          PolicyContextBuilderService,
          SideEffectService,
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
            provide: EmitWorkflowEventUseCase,
            useValue: { execute: jest.fn().mockResolvedValue({}) },
          },
        ],
      }).compile();
      const apply = moduleFixture.get(ApplyCompletionPolicyUseCase);
      const outcome = await apply.execute({ workflowId: workflow.id });
      expect(outcome.type).toBe('incomplete');
      const refreshed = await workflowRepository.findById(workflow.id);
      expect(refreshed?.status).not.toBe(
        WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE,
      );
    });
  });

  describe('case 9: complete → Bitrix Deale do dodania', () => {
    let bitrixProvider: MockBitrixProvider;
    let executeSideEffects: ExecutePendingSideEffectsUseCase;
    let workflowRepository: InMemoryPostsaleWorkflowRepository;

    beforeEach(async () => {
      process.env.BITRIX_STAGE_COMPLETED = 'UC_ZQ68O2';
      workflowRepository = new InMemoryPostsaleWorkflowRepository();
      bitrixProvider = new MockBitrixProvider();
      const workflow = await workflowRepository.create({
        bitrixDealId: 'deal-9',
        status: WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE,
      });
      await workflowRepository.updateDealContext(workflow.id, {
        dealContext: buildPersistedDealContext('deal-9'),
        product: '3D EVAPREMIUM Z RANTAMI',
        status: WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE,
      });
      bitrixProvider.setDeal('deal-9', { id: 'deal-9', fields: {} });
      const moduleFixture = await Test.createTestingModule({
        providers: [
          ExecutePendingSideEffectsUseCase,
          GetWorkflowContextUseCase,
          SideEffectService,
          SideEffectGuard,
          {
            provide: POSTSALE_WORKFLOW_REPOSITORY,
            useValue: workflowRepository,
          },
          {
            provide: SIDE_EFFECT_RECORD_REPOSITORY,
            useClass: InMemorySideEffectRecordRepository,
          },
          { provide: BITRIX_PROVIDER, useValue: bitrixProvider },
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
      executeSideEffects = moduleFixture.get(ExecutePendingSideEffectsUseCase);
    });

    it('Given COMPLETION_PENDING When execute side effects Then Bitrix UC_ZQ68O2', async () => {
      const workflow = await workflowRepository.findByBitrixDealId('deal-9');
      const result = await executeSideEffects.execute({
        workflowId: workflow!.id,
      });
      expect(result.type).toBe('completed');
      expect(bitrixProvider.getStageUpdates()).toEqual([
        { dealId: 'deal-9', stageId: 'UC_ZQ68O2' },
      ]);
    });
  });

  describe('case 10: Bitrix failure → COMPLETED blocked', () => {
    it('Given Bitrix error When execute Then workflow stays pending', async () => {
      process.env.BITRIX_STAGE_COMPLETED = 'UC_ZQ68O2';
      const workflowRepository = new InMemoryPostsaleWorkflowRepository();
      const bitrixProvider = new MockBitrixProvider();
      bitrixProvider.setStageUpdateFailure('Bitrix down');
      const workflow = await workflowRepository.create({
        bitrixDealId: 'deal-10',
        status: WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE,
      });
      await workflowRepository.updateDealContext(workflow.id, {
        dealContext: buildPersistedDealContext('deal-10'),
        product: 'p',
        status: WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE,
      });
      bitrixProvider.setDeal('deal-10', { id: 'deal-10', fields: {} });
      const moduleFixture = await Test.createTestingModule({
        providers: [
          ExecutePendingSideEffectsUseCase,
          GetWorkflowContextUseCase,
          SideEffectService,
          SideEffectGuard,
          {
            provide: POSTSALE_WORKFLOW_REPOSITORY,
            useValue: workflowRepository,
          },
          {
            provide: SIDE_EFFECT_RECORD_REPOSITORY,
            useClass: InMemorySideEffectRecordRepository,
          },
          { provide: BITRIX_PROVIDER, useValue: bitrixProvider },
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
      const result = await moduleFixture
        .get(ExecutePendingSideEffectsUseCase)
        .execute({ workflowId: workflow.id });
      expect(result.type).toBe('blocked');
      if (result.type === 'blocked') {
        expect(result.workflow.status).toBe(
          WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE,
        );
      }
    });
  });

  describe('case 11: follow-up only when missing requirements', () => {
    it('Given completion ready When followup policy Then DENY', () => {
      const result = evaluateFollowupPolicy({
        workflow: baseWorkflow,
        completionOutcome: 'PASS',
        now: new Date(),
        waitingSince: new Date(),
      });
      expect(result.outcome).toBe('DENY');
    });
  });

  describe('case 12: max 3 follow-ups → escalation', () => {
    it('Given max follow-ups When followup policy Then ESCALATE', () => {
      const result = evaluateFollowupPolicy({
        workflow: {
          ...baseWorkflow,
          followUpCount: FOLLOWUP_POLICY_MAX_ATTEMPTS,
        },
        completionOutcome: 'INCOMPLETE',
        now: new Date('2026-02-01'),
        waitingSince: new Date('2026-01-01'),
      });
      expect(result.outcome).toBe('ESCALATE');
    });
  });

  describe('case 13: Telegram failure → completion not blocked', () => {
    it('Given Telegram fails When Bitrix OK Then COMPLETED', async () => {
      process.env.BITRIX_STAGE_COMPLETED = 'UC_ZQ68O2';
      const workflowRepository = new InMemoryPostsaleWorkflowRepository();
      const bitrixProvider = new MockBitrixProvider();
      const telegramProvider = new MockTelegramProvider();
      telegramProvider.setShouldFail(true);
      const workflow = await workflowRepository.create({
        bitrixDealId: 'deal-13',
        status: WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE,
      });
      await workflowRepository.updateDealContext(workflow.id, {
        dealContext: buildPersistedDealContext('deal-13'),
        product: 'p',
        status: WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE,
      });
      bitrixProvider.setDeal('deal-13', { id: 'deal-13', fields: {} });
      const moduleFixture = await Test.createTestingModule({
        providers: [
          ExecutePendingSideEffectsUseCase,
          GetWorkflowContextUseCase,
          SideEffectService,
          SideEffectGuard,
          {
            provide: POSTSALE_WORKFLOW_REPOSITORY,
            useValue: workflowRepository,
          },
          {
            provide: SIDE_EFFECT_RECORD_REPOSITORY,
            useClass: InMemorySideEffectRecordRepository,
          },
          { provide: BITRIX_PROVIDER, useValue: bitrixProvider },
          { provide: TELEGRAM_PROVIDER, useValue: telegramProvider },
          {
            provide: EmitWorkflowEventUseCase,
            useValue: { execute: jest.fn().mockResolvedValue({}) },
          },
        ],
      }).compile();
      const result = await moduleFixture
        .get(ExecutePendingSideEffectsUseCase)
        .execute({ workflowId: workflow.id });
      expect(result.type).toBe('completed');
      if (result.type === 'completed') {
        expect(result.workflow.status).toBe(WorkflowStatus.COMPLETED);
      }
    });
  });

  describe('case 14: forbidden Langflow direct side-effect tools', () => {
    it('Langflow adapter exposes invoke only — no CRM/email write surface', () => {
      const adapter = new HttpLangflowAdapter({
        baseUrl: 'http://langflow.test',
        apiKey: 'test-key',
        fetchImpl: jest.fn(),
      });
      const methods = Object.getOwnPropertyNames(
        Object.getPrototypeOf(adapter),
      ).filter((name) => name !== 'constructor');
      expect(methods).toEqual(['invoke']);
    });

    it('Given Langflow proposes COMPLETE When policy incomplete Then still INCOMPLETE', () => {
      const result = evaluateCompletionPolicy({
        workflow: baseWorkflow,
        requirements: [requirement({ status: RequirementStatus.PENDING })],
        evidenceCountByRequirementId: new Map(),
        langflowAnalysisValid: true,
        bitrixCompletionSideEffectSucceeded: false,
      });
      expect(result.outcome).toBe('INCOMPLETE');
    });
  });

  describe('case 15: confidence < 0.75 rejected', () => {
    it('Given classification confidence 0.5 When validate Then low_confidence', () => {
      const result = validateClassifications(
        [
          {
            sourceField: 'notes_front_3d',
            sourceNote: 'note',
            requirementLabel: RequirementLabel.YES_NO_INFO,
            questionText: 'Please confirm: note',
            classificationReason: 'test',
            confidence: 0.5,
          },
        ],
        [],
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('low_confidence');
      }
    });
  });
});
