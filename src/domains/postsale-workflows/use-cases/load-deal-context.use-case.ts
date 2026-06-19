import { Inject, Injectable, Logger } from '@nestjs/common';
import { parseBitrixDeal } from '../../bitrix/parsers/bitrix-deal.parser';
import {
  DEFAULT_BITRIX_FIELD_MAPPING,
  resolveBitrixFieldMapping,
} from '../../bitrix/config/bitrix-field-mapping';
import { LoadDealContextCommand } from '../../../lib/commands/workflow.commands';
import {
  buildCapabilityResult,
  isContextLoadedStatus,
} from '../../../lib/domain';
import { WorkflowEventType, WorkflowStatus } from '../../../lib/enums';
import {
  BITRIX_PROVIDER,
  BitrixProvider,
} from '../../../integrations/bitrix/bitrix.provider';
import { AuditService } from '../../audit/services/audit.service';
import { IdempotencyService } from '../../idempotency/services/idempotency.service';
import {
  POSTSALE_WORKFLOW_REPOSITORY,
  PostsaleWorkflowRepository,
} from '../repository/postsale-workflow.repository';
import { LoadDealContextOutcome } from './load-deal-context.outcome';

const LOAD_DEAL_CONTEXT_SCOPE = 'load_deal_context';

@Injectable()
export class LoadDealContextUseCase {
  private readonly logger = new Logger(LoadDealContextUseCase.name);

  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly auditService: AuditService,
    @Inject(POSTSALE_WORKFLOW_REPOSITORY)
    private readonly workflowRepository: PostsaleWorkflowRepository,
    @Inject(BITRIX_PROVIDER)
    private readonly bitrixProvider: BitrixProvider,
  ) {}

  async execute(
    command: LoadDealContextCommand,
  ): Promise<LoadDealContextOutcome> {
    const existing = await this.workflowRepository.findById(command.workflowId);
    if (!existing) {
      throw new Error(`Workflow not found: ${command.workflowId}`);
    }

    if (isContextLoadedStatus(existing.status)) {
      return {
        type: 'already_loaded',
        capability: buildCapabilityResult(existing),
        workflow: existing,
      };
    }

    const bitrixPayload = await this.bitrixProvider.readDeal(
      command.bitrixDealId,
    );

    const fieldMapping = resolveBitrixFieldMapping();
    const parseResult = parseBitrixDeal(bitrixPayload, fieldMapping);

    if (!parseResult.ok) {
      this.logger.log({
        event_name: 'bitrix.deal_context.parse_failed',
        workflow_id: command.workflowId,
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

      return {
        type: 'parse_failed',
        reason: parseResult.reason,
        missingFields: parseResult.missingFields,
      };
    }

    const idempotencyKey = `${command.workflowId}:load_deal_context`;
    const idempotencyResult = await this.idempotencyService.checkAndRecord(
      {
        idempotencyKey,
        scope: LOAD_DEAL_CONTEXT_SCOPE,
        requestId: command.requestId,
      },
      command.workflowId,
    );

    if (idempotencyResult.isDuplicate) {
      const workflow = await this.workflowRepository.findById(
        command.workflowId,
      );
      if (!workflow) {
        throw new Error(`Workflow not found: ${command.workflowId}`);
      }

      if (isContextLoadedStatus(workflow.status) || workflow.dealContext) {
        return {
          type: 'already_loaded',
          capability: buildCapabilityResult(workflow),
          workflow,
        };
      }

      throw new Error(
        `Load deal context idempotency duplicate before CONTEXT_LOADED: ${command.workflowId}`,
      );
    }

    this.logger.log({
      event_name: 'bitrix.deal_context.normalized',
      workflow_id: command.workflowId,
      request_id: command.requestId,
      bitrix_deal_id: parseResult.dealContext.bitrixDealId,
      stage_id: bitrixPayload.stageId ?? null,
      deal_context: parseResult.dealContext,
      field_mapping: fieldMapping,
    });

    await this.workflowRepository.updateDealContext(command.workflowId, {
      dealContext: parseResult.dealContext,
      product: parseResult.dealContext.product,
      status: WorkflowStatus.CONTEXT_LOADED,
    });

    await this.auditService.emit({
      workflowId: command.workflowId,
      eventType: WorkflowEventType.DEAL_CONTEXT_LOADED,
      statusBefore: WorkflowStatus.STARTED,
      statusAfter: WorkflowStatus.CONTEXT_LOADED,
      requestId: command.requestId,
    });

    const updated = await this.workflowRepository.findById(command.workflowId);
    if (!updated) {
      throw new Error(`Workflow not found after load: ${command.workflowId}`);
    }

    return {
      type: 'success',
      capability: buildCapabilityResult(updated),
      workflow: updated,
    };
  }
}
