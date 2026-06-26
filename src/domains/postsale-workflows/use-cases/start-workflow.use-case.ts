import { Inject, Injectable } from '@nestjs/common';
import { StartWorkflowCommand } from '../../../lib/commands/workflow.commands';
import { StartWorkflowResult, Workflow } from '../../../lib/domain';
import {
  TemplateMatchStatus,
  WorkflowEventType,
  WorkflowStatus,
} from '../../../lib/enums';
import { BitrixReadError } from '../../../integrations/bitrix/bitrix-read.error';
import { SendInitialEmailUseCase } from '../../email/use-cases/send-initial-email.use-case';
import { EmitWorkflowEventUseCase } from '../../audit/use-cases/emit-workflow-event.use-case';
import { CheckIdempotencyUseCase } from '../../idempotency/use-cases/check-idempotency.use-case';
import { CreateRequirementsUseCase } from '../../requirements/use-cases/create-requirements.use-case';
import {
  POSTSALE_WORKFLOW_REPOSITORY,
  PostsaleWorkflowRepository,
} from '../repository/postsale-workflow.repository';
import { DuplicateStartWorkflowInProgressError } from '../errors/start-workflow.errors';
import { EscalateWorkflowUseCase } from './escalate-workflow.use-case';
import { FailWorkflowUseCase } from './fail-workflow.use-case';
import { LoadDealContextUseCase } from './load-deal-context.use-case';
import { MatchWorkflowTemplateUseCase } from './match-workflow-template.use-case';
import { NotifyTemplateMatchEscalationUseCase } from './notify-template-match-escalation.use-case';

const STARTUP_CONTINUATION_STATUSES: WorkflowStatus[] = [
  WorkflowStatus.TEMPLATE_MATCHED,
  WorkflowStatus.REQUIREMENTS_CREATED,
];

const START_WORKFLOW_SCOPE = 'start_workflow';

@Injectable()
export class StartWorkflowUseCase {
  constructor(
    private readonly checkIdempotencyUseCase: CheckIdempotencyUseCase,
    private readonly emitWorkflowEventUseCase: EmitWorkflowEventUseCase,
    @Inject(POSTSALE_WORKFLOW_REPOSITORY)
    private readonly workflowRepository: PostsaleWorkflowRepository,
    private readonly loadDealContextUseCase: LoadDealContextUseCase,
    private readonly matchWorkflowTemplateUseCase: MatchWorkflowTemplateUseCase,
    private readonly createRequirementsUseCase: CreateRequirementsUseCase,
    private readonly sendInitialEmailUseCase: SendInitialEmailUseCase,
    private readonly escalateWorkflowUseCase: EscalateWorkflowUseCase,
    private readonly notifyTemplateMatchEscalationUseCase: NotifyTemplateMatchEscalationUseCase,
    private readonly failWorkflowUseCase: FailWorkflowUseCase,
  ) {}

  async execute(command: StartWorkflowCommand): Promise<StartWorkflowResult> {
    const idempotencyResult = await this.checkIdempotencyUseCase.execute({
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
        const continued = await this.continueStartupPipeline(
          existing.id,
          command.requestId,
        );
        return this.toResult(continued, true);
      }

      throw new DuplicateStartWorkflowInProgressError(command.idempotencyKey);
    }

    const existingByDeal = await this.workflowRepository.findByBitrixDealId(
      command.bitrixDealId,
    );
    if (existingByDeal) {
      await this.checkIdempotencyUseCase.linkWorkflowId(
        command.idempotencyKey,
        existingByDeal.id,
      );
      const continued = await this.continueStartupPipeline(
        existingByDeal.id,
        command.requestId,
      );
      return this.toResult(continued, true);
    }

    const workflow = await this.workflowRepository.create({
      bitrixDealId: command.bitrixDealId,
      status: WorkflowStatus.STARTED,
    });

    await this.checkIdempotencyUseCase.linkWorkflowId(
      command.idempotencyKey,
      workflow.id,
    );

    await this.emitWorkflowEventUseCase.execute({
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
      matchOutcome.type === 'already_matched' ||
      matchOutcome.type === 'matched'
    ) {
      const continued = await this.continueStartupPipeline(
        workflow.id,
        command.requestId,
      );
      return this.toResult(continued, false);
    }

    const escalated = await this.escalateWorkflowUseCase.execute({
      workflowId: workflow.id,
      reason:
        matchOutcome.matchResult.escalationReason ??
        matchOutcome.matchResult.status,
      templateMatchStatus: matchOutcome.matchResult.status,
      requestId: command.requestId,
    });

    await this.notifyTemplateMatchEscalationUseCase.execute({
      workflowId: workflow.id,
      templateMatchStatus: matchOutcome.matchResult.status,
      reason:
        matchOutcome.matchResult.escalationReason ??
        matchOutcome.matchResult.status,
      requestId: command.requestId,
    });

    return this.toResult(escalated, false);
  }

  private async continueStartupPipeline(
    workflowId: string,
    requestId?: string,
  ): Promise<Workflow> {
    let workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (!STARTUP_CONTINUATION_STATUSES.includes(workflow.status)) {
      return workflow;
    }

    if (workflow.status === WorkflowStatus.TEMPLATE_MATCHED) {
      const requirementsOutcome = await this.createRequirementsUseCase.execute({
        workflowId,
        requestId,
      });

      if (requirementsOutcome.type === 'escalated') {
        return requirementsOutcome.workflow;
      }

      workflow = requirementsOutcome.workflow;
    }

    if (workflow.status === WorkflowStatus.REQUIREMENTS_CREATED) {
      const emailOutcome = await this.sendInitialEmailUseCase.execute({
        workflowId,
        requestId,
      });

      if (emailOutcome.type === 'escalated') {
        return emailOutcome.workflow;
      }

      if (
        emailOutcome.type === 'sent' ||
        emailOutcome.type === 'already_sent'
      ) {
        return emailOutcome.workflow;
      }

      const escalated = await this.escalateWorkflowUseCase.execute({
        workflowId,
        reason: emailOutcome.reason,
        requestId,
      });
      return escalated;
    }

    return workflow;
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
