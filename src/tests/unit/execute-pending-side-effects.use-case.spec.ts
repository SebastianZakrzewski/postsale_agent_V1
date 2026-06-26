import { Test, TestingModule } from '@nestjs/testing';
import { EmitWorkflowEventUseCase } from '../../domains/audit/use-cases/emit-workflow-event.use-case';
import { ExecutePendingSideEffectsUseCase } from '../../domains/postsale-workflows/use-cases/execute-pending-side-effects.use-case';
import { GetWorkflowContextUseCase } from '../../domains/postsale-workflows/use-cases/get-workflow-context.use-case';
import { POSTSALE_WORKFLOW_REPOSITORY } from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import {
  CreateSideEffectRecordInput,
  SIDE_EFFECT_RECORD_REPOSITORY,
  SideEffectRecordRepository,
} from '../../domains/side-effects/repository/side-effect-record.repository';
import { SideEffectGuard } from '../../domains/side-effects/guards/side-effect.guard';
import { SideEffectService } from '../../domains/side-effects/services/side-effect.service';
import { BITRIX_PROVIDER } from '../../integrations/bitrix/bitrix.provider';
import { TELEGRAM_PROVIDER } from '../../integrations/telegram/telegram.provider';
import {
  EvidenceType,
  RequirementLabel,
  RequirementStatus,
  SideEffectRecordStatus,
  TemplateMatchStatus,
  WorkflowStatus,
} from '../../lib/enums';
import { SideEffectRecordRow } from '../../lib/persistence';
import { InMemoryPostsaleWorkflowRepository } from '../helpers/in-memory-postsale-workflow.repository';
import { InMemoryWorkflowRequirementRepository } from '../helpers/in-memory-workflow-requirement.repository';
import { InMemoryRequirementEvidenceRepository } from '../helpers/in-memory-requirement-evidence.repository';
import { MockBitrixProvider } from '../../integrations/bitrix/mock-bitrix.provider';
import { MockTelegramProvider } from '../helpers/mock-telegram.provider';
import { buildPersistedDealContext } from '../helpers/bitrix-deal-fields';
import { SendCompletionConfirmationEmailUseCase } from '../../domains/email/use-cases/send-completion-confirmation-email.use-case';
import { WORKFLOW_REQUIREMENT_REPOSITORY } from '../../domains/requirements/repository/workflow-requirement.repository';
import { REQUIREMENT_EVIDENCE_REPOSITORY } from '../../domains/requirements/repository/requirement-evidence.repository';

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

describe('ExecutePendingSideEffectsUseCase', () => {
  let useCase: ExecutePendingSideEffectsUseCase;
  let workflowRepository: InMemoryPostsaleWorkflowRepository;
  let bitrixProvider: MockBitrixProvider;
  let telegramProvider: MockTelegramProvider;
  let requirementRepository: InMemoryWorkflowRequirementRepository;
  let evidenceRepository: InMemoryRequirementEvidenceRepository;

  beforeEach(async () => {
    process.env.BITRIX_STAGE_COMPLETED = 'UC_ZQ68O2';
    process.env.BITRIX_COMPLETION_STAGE_UPDATE_ENABLED = 'true';
    workflowRepository = new InMemoryPostsaleWorkflowRepository();
    bitrixProvider = new MockBitrixProvider();
    telegramProvider = new MockTelegramProvider();
    requirementRepository = new InMemoryWorkflowRequirementRepository();
    evidenceRepository = new InMemoryRequirementEvidenceRepository();

    const workflow = await workflowRepository.create({
      bitrixDealId: 'deal-1',
      status: WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE,
    });
    await workflowRepository.updateDealContext(workflow.id, {
      dealContext: buildPersistedDealContext('deal-1'),
      product: 'Komplet Classic',
      status: WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE,
    });
    await workflowRepository.updateTemplateMatch(workflow.id, {
      templateMatchStatus: TemplateMatchStatus.MATCHED,
      status: WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE,
      carTemplateId: 'tpl-1',
    });
    bitrixProvider.setDeal('deal-1', { id: 'deal-1', fields: {} });

    const requirement = await requirementRepository.create({
      workflow_id: workflow.id,
      label: RequirementLabel.YES_NO_INFO,
      status: RequirementStatus.VALID,
      source_note: 'Czy jest gaśnica?',
      source_field: 'notes_front_3d',
      classification_reason: 'test',
      confidence: 0.9,
    });
    await evidenceRepository.createMany([
      {
        requirement_id: requirement.id,
        workflow_id: workflow.id,
        evidence_type: EvidenceType.TEXT_FRAGMENT,
        source_ref: null,
        content: 'tak',
      },
    ]);

    const moduleFixture: TestingModule = await Test.createTestingModule({
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
        {
          provide: BITRIX_PROVIDER,
          useValue: bitrixProvider,
        },
        {
          provide: TELEGRAM_PROVIDER,
          useValue: telegramProvider,
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
          provide: SendCompletionConfirmationEmailUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue({ type: 'sent' }),
          },
        },
        {
          provide: EmitWorkflowEventUseCase,
          useValue: { execute: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    useCase = moduleFixture.get(ExecutePendingSideEffectsUseCase);
  });

  it('completes without Bitrix stage update when completion stage update is disabled', async () => {
    delete process.env.BITRIX_COMPLETION_STAGE_UPDATE_ENABLED;
    const workflow = await workflowRepository.findByBitrixDealId('deal-1');
    const result = await useCase.execute({ workflowId: workflow!.id });

    expect(result.type).toBe('completed');
    expect(bitrixProvider.getStageUpdates()).toEqual([]);
    if (result.type === 'completed') {
      expect(result.workflow.status).toBe(WorkflowStatus.COMPLETED);
    }
  });

  it('moves Bitrix to completed stage (case 9)', async () => {
    const workflow = await workflowRepository.findByBitrixDealId('deal-1');
    const result = await useCase.execute({ workflowId: workflow!.id });

    expect(result.type).toBe('completed');
    if (result.type !== 'completed') {
      return;
    }
    expect(bitrixProvider.getStageUpdates()).toEqual([
      { dealId: 'deal-1', stageId: 'UC_ZQ68O2' },
    ]);
    expect(bitrixProvider.getComments()[0]?.comment).toContain(
      'Czy jest gaśnica? → tak',
    );
    expect(telegramProvider.sentMessages[0]?.message).toBe(
      'Klient poprawnie odpowiedział na informacje dotyczące uwag szablonów.\nhttps://evapremium.bitrix24.pl/crm/deal/details/deal-1/',
    );
    expect(result.workflow.status).toBe(WorkflowStatus.COMPLETED);
  });

  it('blocks COMPLETED when Bitrix update fails (case 10)', async () => {
    bitrixProvider.setStageUpdateFailure('Bitrix unavailable');
    const workflow = await workflowRepository.findByBitrixDealId('deal-1');
    const result = await useCase.execute({ workflowId: workflow!.id });

    expect(result.type).toBe('blocked');
    if (result.type !== 'blocked') {
      return;
    }
    expect(result.workflow.status).toBe(
      WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE,
    );
  });

  it('allows COMPLETED when Telegram fails (case 13)', async () => {
    telegramProvider.setShouldFail(true);
    const workflow = await workflowRepository.findByBitrixDealId('deal-1');
    const result = await useCase.execute({ workflowId: workflow!.id });

    expect(result.type).toBe('completed');
    if (result.type !== 'completed') {
      return;
    }
    expect(result.workflow.status).toBe(WorkflowStatus.COMPLETED);
  });

  it('retries Bitrix completion after transient failure', async () => {
    bitrixProvider.setStageUpdateFailure('Bitrix unavailable');
    const workflow = await workflowRepository.findByBitrixDealId('deal-1');
    const first = await useCase.execute({ workflowId: workflow!.id });
    expect(first.type).toBe('blocked');

    bitrixProvider.clearStageUpdateFailure();
    const second = await useCase.execute({ workflowId: workflow!.id });
    expect(second.type).toBe('completed');
    if (second.type === 'completed') {
      expect(second.workflow.status).toBe(WorkflowStatus.COMPLETED);
    }
  });

  it('blocks ESCALATED when Bitrix escalation update fails', async () => {
    process.env.BITRIX_STAGE_ESCALATED = 'UC_ESCALATED';
    const workflow = await workflowRepository.findByBitrixDealId('deal-1');
    await workflowRepository.updateStatus(
      workflow!.id,
      WorkflowStatus.ESCALATION_PENDING_BITRIX_UPDATE,
    );

    bitrixProvider.setStageUpdateFailure('Bitrix unavailable');
    const result = await useCase.execute({ workflowId: workflow!.id });

    expect(result.type).toBe('blocked');
    if (result.type === 'blocked') {
      expect(result.workflow.status).toBe(
        WorkflowStatus.ESCALATION_PENDING_BITRIX_UPDATE,
      );
    }
  });
});
