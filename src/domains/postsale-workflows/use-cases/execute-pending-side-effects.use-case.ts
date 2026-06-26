import { Inject, Injectable } from '@nestjs/common';
import { ExecutePendingSideEffectsCommand } from '../../../lib/commands/workflow.commands';
import { buildCapabilityResult, CapabilityResult } from '../../../lib/domain';
import {
  SideEffectType,
  WorkflowEventType,
  WorkflowStatus,
} from '../../../lib/enums';
import {
  BITRIX_PROVIDER,
  BitrixProvider,
} from '../../../integrations/bitrix/bitrix.provider';
import {
  TELEGRAM_PROVIDER,
  TelegramProvider,
} from '../../../integrations/telegram/telegram.provider';
import {
  resolveBitrixStageCompleted,
  resolveBitrixStageEscalated,
} from '../../bitrix/config/bitrix-stage.config';
import { EmitWorkflowEventUseCase } from '../../audit/use-cases/emit-workflow-event.use-case';
import { SideEffectGuard } from '../../side-effects/guards/side-effect.guard';
import { SideEffectService } from '../../side-effects/services/side-effect.service';
import {
  POSTSALE_WORKFLOW_REPOSITORY,
  PostsaleWorkflowRepository,
} from '../repository/postsale-workflow.repository';
import { GetWorkflowContextUseCase } from './get-workflow-context.use-case';

export type ExecutePendingSideEffectsOutcome =
  | {
      type: 'completed';
      capability: CapabilityResult;
      workflow: NonNullable<
        Awaited<ReturnType<PostsaleWorkflowRepository['findById']>>
      >;
    }
  | {
      type: 'escalated';
      capability: CapabilityResult;
      workflow: NonNullable<
        Awaited<ReturnType<PostsaleWorkflowRepository['findById']>>
      >;
    }
  | {
      type: 'blocked';
      reason: string;
      workflow: NonNullable<
        Awaited<ReturnType<PostsaleWorkflowRepository['findById']>>
      >;
    }
  | {
      type: 'rejected';
      reason: string;
    };

@Injectable()
export class ExecutePendingSideEffectsUseCase {
  constructor(
    private readonly getWorkflowContextUseCase: GetWorkflowContextUseCase,
    @Inject(POSTSALE_WORKFLOW_REPOSITORY)
    private readonly workflowRepository: PostsaleWorkflowRepository,
    @Inject(BITRIX_PROVIDER)
    private readonly bitrixProvider: BitrixProvider,
    @Inject(TELEGRAM_PROVIDER)
    private readonly telegramProvider: TelegramProvider,
    private readonly sideEffectService: SideEffectService,
    private readonly sideEffectGuard: SideEffectGuard,
    private readonly emitWorkflowEventUseCase: EmitWorkflowEventUseCase,
  ) {}

  async execute(
    command: ExecutePendingSideEffectsCommand,
  ): Promise<ExecutePendingSideEffectsOutcome> {
    const { workflow } = await this.getWorkflowContextUseCase.execute({
      workflowId: command.workflowId,
    });

    if (workflow.status === WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE) {
      return this.executeCompletionPath(command, workflow);
    }

    if (workflow.status === WorkflowStatus.ESCALATION_PENDING_BITRIX_UPDATE) {
      return this.executeEscalationPath(command, workflow);
    }

    return {
      type: 'rejected',
      reason: `invalid_status_${workflow.status}`,
    };
  }

  private async executeCompletionPath(
    command: ExecutePendingSideEffectsCommand,
    workflow: NonNullable<
      Awaited<ReturnType<PostsaleWorkflowRepository['findById']>>
    >,
  ): Promise<ExecutePendingSideEffectsOutcome> {
    const stageId = resolveBitrixStageCompleted();
    const bitrixKey = `${command.workflowId}:bitrix_complete`;

    const bitrixRecord = await this.sideEffectService.record({
      workflowId: command.workflowId,
      sideEffectType: SideEffectType.UPDATE_BITRIX_STAGE_TO_COMPLETED,
      idempotencyKey: bitrixKey,
      requestId: command.requestId,
    });

    this.sideEffectGuard.assertCanExecute(bitrixRecord);

    try {
      await this.bitrixProvider.updateDealStage(workflow.bitrixDealId, stageId);
      await this.sideEffectService.markSucceeded(bitrixRecord.id, {
        stageId,
      });
    } catch (error) {
      await this.sideEffectService.markFailed(
        bitrixRecord.id,
        error instanceof Error ? error.message : 'BITRIX_UPDATE_FAILED',
        true,
      );
      const current = await this.workflowRepository.findById(
        command.workflowId,
      );
      if (!current) {
        throw new Error(`Workflow not found: ${command.workflowId}`);
      }
      return {
        type: 'blocked',
        reason: 'bitrix_update_failed',
        workflow: current,
      };
    }

    await this.emitWorkflowEventUseCase.execute({
      workflowId: command.workflowId,
      eventType: WorkflowEventType.BITRIX_STAGE_UPDATE_SUCCEEDED,
      statusBefore: WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE,
      statusAfter: WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE,
      payload: { stageId, path: 'completion' },
      requestId: command.requestId,
    });

    await this.recordCommentSideEffect(
      command,
      workflow.bitrixDealId,
      'Postsale Agent: wymagania zebrane, deal przeniesiony do Deale do dodania.',
      'completion',
    );

    await this.tryTelegramNotification(
      command,
      `Workflow ${command.workflowId} completed for deal ${workflow.bitrixDealId}`,
      'completion',
    );

    await this.workflowRepository.updateStatus(
      command.workflowId,
      WorkflowStatus.COMPLETED,
    );

    await this.emitWorkflowEventUseCase.execute({
      workflowId: command.workflowId,
      eventType: WorkflowEventType.WORKFLOW_COMPLETED,
      statusBefore: WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE,
      statusAfter: WorkflowStatus.COMPLETED,
      payload: {},
      requestId: command.requestId,
    });

    const updated = await this.workflowRepository.findById(command.workflowId);
    if (!updated) {
      throw new Error(
        `Workflow not found after completion: ${command.workflowId}`,
      );
    }

    return {
      type: 'completed',
      capability: buildCapabilityResult(updated),
      workflow: updated,
    };
  }

  private async executeEscalationPath(
    command: ExecutePendingSideEffectsCommand,
    workflow: NonNullable<
      Awaited<ReturnType<PostsaleWorkflowRepository['findById']>>
    >,
  ): Promise<ExecutePendingSideEffectsOutcome> {
    const stageId = resolveBitrixStageEscalated();
    const bitrixKey = `${command.workflowId}:bitrix_escalate`;

    const bitrixRecord = await this.sideEffectService.record({
      workflowId: command.workflowId,
      sideEffectType: SideEffectType.UPDATE_BITRIX_STAGE_TO_ESCALATED,
      idempotencyKey: bitrixKey,
      requestId: command.requestId,
    });

    this.sideEffectGuard.assertCanExecute(bitrixRecord);

    await this.bitrixProvider.updateDealStage(workflow.bitrixDealId, stageId);
    await this.sideEffectService.markSucceeded(bitrixRecord.id, { stageId });

    await this.recordCommentSideEffect(
      command,
      workflow.bitrixDealId,
      'Postsale Agent: wymaga ręcznej weryfikacji.',
      'escalation',
    );

    await this.tryTelegramNotification(
      command,
      `Workflow ${command.workflowId} escalated for deal ${workflow.bitrixDealId}`,
      'escalation',
    );

    await this.workflowRepository.updateStatus(
      command.workflowId,
      WorkflowStatus.ESCALATED,
    );

    await this.emitWorkflowEventUseCase.execute({
      workflowId: command.workflowId,
      eventType: WorkflowEventType.WORKFLOW_ESCALATED,
      statusBefore: WorkflowStatus.ESCALATION_PENDING_BITRIX_UPDATE,
      statusAfter: WorkflowStatus.ESCALATED,
      payload: {},
      requestId: command.requestId,
    });

    const updated = await this.workflowRepository.findById(command.workflowId);
    if (!updated) {
      throw new Error(
        `Workflow not found after escalation: ${command.workflowId}`,
      );
    }

    return {
      type: 'escalated',
      capability: buildCapabilityResult(updated),
      workflow: updated,
    };
  }

  private async recordCommentSideEffect(
    command: ExecutePendingSideEffectsCommand,
    dealId: string,
    comment: string,
    path: 'completion' | 'escalation',
  ): Promise<void> {
    const idempotencyKey = `${command.workflowId}:bitrix_comment:${path}`;
    const record = await this.sideEffectService.record({
      workflowId: command.workflowId,
      sideEffectType: SideEffectType.CREATE_BITRIX_COMMENT,
      idempotencyKey,
      requestId: command.requestId,
    });

    this.sideEffectGuard.assertCanExecute(record);

    try {
      await this.bitrixProvider.addDealComment(dealId, comment);
      await this.sideEffectService.markSucceeded(record.id, { dealId });
    } catch (error) {
      await this.sideEffectService.markFailed(
        record.id,
        error instanceof Error ? error.message : 'BITRIX_COMMENT_FAILED',
        true,
      );
    }
  }

  private async tryTelegramNotification(
    command: ExecutePendingSideEffectsCommand,
    message: string,
    path: 'completion' | 'escalation',
  ): Promise<void> {
    const idempotencyKey = `${command.workflowId}:telegram:${path}`;
    const record = await this.sideEffectService.record({
      workflowId: command.workflowId,
      sideEffectType: SideEffectType.SEND_TELEGRAM_NOTIFICATION,
      idempotencyKey,
      requestId: command.requestId,
    });

    this.sideEffectGuard.assertCanExecute(record);

    try {
      await this.telegramProvider.sendNotification({ message });
      await this.sideEffectService.markSucceeded(record.id, {});
    } catch (error) {
      await this.sideEffectService.markFailed(
        record.id,
        error instanceof Error ? error.message : 'TELEGRAM_SEND_FAILED',
        path === 'escalation',
      );
    }
  }
}
