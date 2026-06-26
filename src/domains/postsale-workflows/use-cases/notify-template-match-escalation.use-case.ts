import { Inject, Injectable } from '@nestjs/common';
import { NotifyTemplateMatchEscalationCommand } from '../../../lib/commands/workflow.commands';
import { TemplateMatchStatus } from '../../../lib/enums';
import { SideEffectRecordStatus, SideEffectType } from '../../../lib/enums';
import {
  BITRIX_PROVIDER,
  BitrixProvider,
} from '../../../integrations/bitrix/bitrix.provider';
import { buildBitrixTemplateMatchEscalationComment } from '../../bitrix/services/bitrix-template-match-comment.builder';
import { SideEffectGuard } from '../../side-effects/guards/side-effect.guard';
import { SideEffectService } from '../../side-effects/services/side-effect.service';
import { GetWorkflowContextUseCase } from './get-workflow-context.use-case';

@Injectable()
export class NotifyTemplateMatchEscalationUseCase {
  constructor(
    private readonly getWorkflowContextUseCase: GetWorkflowContextUseCase,
    @Inject(BITRIX_PROVIDER)
    private readonly bitrixProvider: BitrixProvider,
    private readonly sideEffectService: SideEffectService,
    private readonly sideEffectGuard: SideEffectGuard,
  ) {}

  async execute(command: NotifyTemplateMatchEscalationCommand): Promise<void> {
    const { workflow } = await this.getWorkflowContextUseCase.execute({
      workflowId: command.workflowId,
    });

    if (
      command.templateMatchStatus !== TemplateMatchStatus.AMBIGUOUS &&
      command.templateMatchStatus !== TemplateMatchStatus.NOT_FOUND
    ) {
      return;
    }

    const comment = buildBitrixTemplateMatchEscalationComment({
      templateMatchStatus: command.templateMatchStatus,
      reason: command.reason,
    });

    const idempotencyKey = `${command.workflowId}:bitrix_comment:template_match_${command.templateMatchStatus.toLowerCase()}`;
    const record = await this.sideEffectService.recordForExecution({
      workflowId: command.workflowId,
      sideEffectType: SideEffectType.CREATE_BITRIX_COMMENT,
      idempotencyKey,
      requestId: command.requestId,
    });

    if (record.status === SideEffectRecordStatus.SUCCEEDED) {
      return;
    }

    this.sideEffectGuard.assertCanExecute(record);

    try {
      await this.bitrixProvider.addDealComment(workflow.bitrixDealId, comment);
      await this.sideEffectService.markSucceeded(record.id, {
        dealId: workflow.bitrixDealId,
        templateMatchStatus: command.templateMatchStatus,
      });
    } catch (error) {
      await this.sideEffectService.markFailed(
        record.id,
        error instanceof Error ? error.message : 'BITRIX_COMMENT_FAILED',
        true,
      );
    }
  }
}
