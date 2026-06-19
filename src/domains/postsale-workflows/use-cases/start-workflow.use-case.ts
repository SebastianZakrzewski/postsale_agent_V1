import { Inject, Injectable, Logger } from '@nestjs/common';
import { parseBitrixDeal } from '../../bitrix/parsers/bitrix-deal.parser';
import {
  DEFAULT_BITRIX_FIELD_MAPPING,
  resolveBitrixFieldMapping,
} from '../../bitrix/config/bitrix-field-mapping';
import { StartWorkflowCommand } from '../../../lib/commands/workflow.commands';
import { StartWorkflowResult } from '../../../lib/domain';
import {
  TemplateMatchStatus,
  WorkflowEventType,
  WorkflowStatus,
} from '../../../lib/enums';
import {
  BITRIX_PROVIDER,
  BitrixProvider,
} from '../../../integrations/bitrix/bitrix.provider';
import { BitrixReadError } from '../../../integrations/bitrix/bitrix-read.error';
import { AuditService } from '../../audit/services/audit.service';
import { IdempotencyService } from '../../idempotency/services/idempotency.service';
import { MatchTemplateUseCase } from '../../template-matching/use-cases/match-template.use-case';
import {
  POSTSALE_WORKFLOW_REPOSITORY,
  PostsaleWorkflowRepository,
} from '../repository/postsale-workflow.repository';
import { DuplicateStartWorkflowInProgressError } from '../errors/start-workflow.errors';
import { EscalateWorkflowUseCase } from './escalate-workflow.use-case';
import { FailWorkflowUseCase } from './fail-workflow.use-case';

const START_WORKFLOW_SCOPE = 'start_workflow';

@Injectable()
export class StartWorkflowUseCase {
  private readonly logger = new Logger(StartWorkflowUseCase.name);

  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly auditService: AuditService,
    @Inject(POSTSALE_WORKFLOW_REPOSITORY)
    private readonly workflowRepository: PostsaleWorkflowRepository,
    @Inject(BITRIX_PROVIDER)
    private readonly bitrixProvider: BitrixProvider,
    private readonly matchTemplateUseCase: MatchTemplateUseCase,
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

    let bitrixPayload;
    try {
      bitrixPayload = await this.bitrixProvider.readDeal(command.bitrixDealId);
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

    const fieldMapping = resolveBitrixFieldMapping();
    const parseResult = parseBitrixDeal(bitrixPayload, fieldMapping);

    if (!parseResult.ok) {
      this.logger.log({
        event_name: 'bitrix.deal_context.parse_failed',
        workflow_id: workflow.id,
        request_id: command.requestId,
        bitrix_deal_id: bitrixPayload.id,
        stage_id: bitrixPayload.stageId ?? null,
        reason: parseResult.reason,
        missing_fields: parseResult.missingFields,
        field_mapping: fieldMapping,
        raw_field_sample: Object.fromEntries(
          Object.values(DEFAULT_BITRIX_FIELD_MAPPING).map((key) => [
            key,
            bitrixPayload.fields?.[key] ?? null,
          ]),
        ),
      });

      const escalated = await this.escalateWorkflowUseCase.execute({
        workflowId: workflow.id,
        reason: parseResult.reason,
        templateMatchStatus: TemplateMatchStatus.NOT_FOUND,
        requestId: command.requestId,
      });
      return this.toResult(escalated, false);
    }

    this.logger.log({
      event_name: 'bitrix.deal_context.normalized',
      workflow_id: workflow.id,
      request_id: command.requestId,
      bitrix_deal_id: parseResult.dealContext.bitrixDealId,
      stage_id: bitrixPayload.stageId ?? null,
      deal_context: parseResult.dealContext,
      field_mapping: fieldMapping,
    });

    await this.workflowRepository.updateStatus(
      workflow.id,
      WorkflowStatus.CONTEXT_LOADED,
    );

    await this.auditService.emit({
      workflowId: workflow.id,
      eventType: WorkflowEventType.DEAL_CONTEXT_LOADED,
      statusBefore: WorkflowStatus.STARTED,
      statusAfter: WorkflowStatus.CONTEXT_LOADED,
      requestId: command.requestId,
    });

    const matchResult = await this.matchTemplateUseCase.execute({
      brand: parseResult.dealContext.brand,
      model: parseResult.dealContext.model,
      bodyType: parseResult.dealContext.bodyType,
      generation: parseResult.dealContext.generation,
    });

    if (matchResult.status === TemplateMatchStatus.MATCHED) {
      await this.workflowRepository.updateTemplateMatchStatus(
        workflow.id,
        TemplateMatchStatus.MATCHED,
      );
      await this.workflowRepository.updateStatus(
        workflow.id,
        WorkflowStatus.TEMPLATE_MATCHED,
      );

      await this.auditService.emit({
        workflowId: workflow.id,
        eventType: WorkflowEventType.TEMPLATE_MATCH_SUCCEEDED,
        statusBefore: WorkflowStatus.CONTEXT_LOADED,
        statusAfter: WorkflowStatus.TEMPLATE_MATCHED,
        payload: {
          carTemplateId: matchResult.carTemplateId ?? null,
        },
        requestId: command.requestId,
      });

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
      reason: matchResult.escalationReason ?? matchResult.status,
      templateMatchStatus: matchResult.status,
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
