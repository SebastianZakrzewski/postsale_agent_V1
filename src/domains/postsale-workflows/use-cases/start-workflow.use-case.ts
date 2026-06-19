import { Inject, Injectable } from '@nestjs/common';
import { StartWorkflowCommand } from '../../../lib/commands/workflow.commands';
import { StartWorkflowResult } from '../../../lib/domain';
import {
  TemplateMatchStatus,
  WorkflowEventType,
  WorkflowStatus,
} from '../../../lib/enums';
import { BitrixReadError } from '../../../integrations/bitrix/bitrix-read.error';
import { AuditService } from '../../audit/services/audit.service';
import { IdempotencyService } from '../../idempotency/services/idempotency.service';
import {
  POSTSALE_WORKFLOW_REPOSITORY,
  PostsaleWorkflowRepository,
} from '../repository/postsale-workflow.repository';
import { DuplicateStartWorkflowInProgressError } from '../errors/start-workflow.errors';
import { EscalateWorkflowUseCase } from './escalate-workflow.use-case';
import { FailWorkflowUseCase } from './fail-workflow.use-case';
import { LoadDealContextUseCase } from './load-deal-context.use-case';
import { MatchWorkflowTemplateUseCase } from './match-workflow-template.use-case';

const START_WORKFLOW_SCOPE = 'start_workflow';

@Injectable()
export class StartWorkflowUseCase {
  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly auditService: AuditService,
    @Inject(POSTSALE_WORKFLOW_REPOSITORY)
    private readonly workflowRepository: PostsaleWorkflowRepository,
    private readonly loadDealContextUseCase: LoadDealContextUseCase,
    private readonly matchWorkflowTemplateUseCase: MatchWorkflowTemplateUseCase,
    private readonly escalateWorkflowUseCase: EscalateWorkflowUseCase,
    private readonly failWorkflowUseCase: FailWorkflowUseCase,
  ) {}

  async execute(command: StartWorkflowCommand): Promise<StartWorkflowResult> {
    const idempotencyResult = await this.idempotencyService.checkAndRecord({
      idempotencyKey: command.idempotencyKey,
      scope: START_WORKFLOW_SCOPE,
      requestId: command.requestId,
    });

    if (idempotencyResult.isDuplicate) {
      const existing = await this.resolveExistingWorkflow(
        idempotencyResult.workflowId,
        command.bitrixDealId,
      );
      if (existing) {
        return this.toResult(existing, true);
      }

      throw new DuplicateStartWorkflowInProgressError(command.idempotencyKey);
    }

    const existingByDeal = await this.workflowRepository.findByBitrixDealId(
      command.bitrixDealId,
    );
    if (existingByDeal) {
      await this.idempotencyService.linkWorkflowId(
        command.idempotencyKey,
        existingByDeal.id,
      );
      return this.toResult(existingByDeal, true);
    }

    const workflow = await this.workflowRepository.create({
      bitrixDealId: command.bitrixDealId,
      status: WorkflowStatus.STARTED,
    });

    await this.idempotencyService.linkWorkflowId(
      command.idempotencyKey,
      workflow.id,
    );

    await this.auditService.emit({
      workflowId: workflow.id,
      eventType: WorkflowEventType.WORKFLOW_STARTED,
      statusAfter: WorkflowStatus.STARTED,
      requestId: command.requestId,
    });

    let loadOutcome;
    try {
      loadOutcome = await this.loadDealContextUseCase.execute({
        workflowId: workflow.id,
        bitrixDealId: command.bitrixDealId,
        requestId: command.requestId,
      });
    } catch (error) {
      if (error instanceof BitrixReadError) {
        const failed = await this.failWorkflowUseCase.execute({
          workflowId: workflow.id,
          reason: 'bitrix_read_failed',
          errorMessage: error.message,
          requestId: command.requestId,
        });
        return this.toResult(failed, false);
      }

      throw error;
    }

    if (loadOutcome.type === 'parse_failed') {
      const escalated = await this.escalateWorkflowUseCase.execute({
        workflowId: workflow.id,
        reason: loadOutcome.reason,
        templateMatchStatus: TemplateMatchStatus.NOT_FOUND,
        requestId: command.requestId,
      });
      return this.toResult(escalated, false);
    }

    const matchOutcome = await this.matchWorkflowTemplateUseCase.execute({
      workflowId: workflow.id,
      requestId: command.requestId,
    });

    if (
      matchOutcome.type === 'success' ||
      matchOutcome.type === 'already_matched'
    ) {
      const updated = await this.workflowRepository.findById(workflow.id);
      if (!updated) {
        throw new Error(
          `Workflow not found after template match: ${workflow.id}`,
        );
      }
      return this.toResult(updated, false);
    }

    const escalated = await this.escalateWorkflowUseCase.execute({
      workflowId: workflow.id,
      reason:
        matchOutcome.matchResult.escalationReason ??
        matchOutcome.matchResult.status,
      templateMatchStatus: matchOutcome.matchResult.status,
      requestId: command.requestId,
    });

    return this.toResult(escalated, false);
  }

  private async resolveExistingWorkflow(
    workflowId: string | undefined,
    bitrixDealId: string,
  ) {
    if (workflowId) {
      const byId = await this.workflowRepository.findById(workflowId);
      if (byId) {
        return byId;
      }
    }

    return this.workflowRepository.findByBitrixDealId(bitrixDealId);
  }

  private toResult(
    workflow: {
      id: string;
      status: WorkflowStatus;
      templateMatchStatus: TemplateMatchStatus | null;
    },
    isDuplicate: boolean,
  ): StartWorkflowResult {
    return {
      workflowId: workflow.id,
      status: workflow.status,
      templateMatchStatus: workflow.templateMatchStatus,
      isDuplicate,
    };
  }
}
