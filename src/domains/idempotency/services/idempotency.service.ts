import { Inject, Injectable, Logger } from '@nestjs/common';
import { CheckIdempotencyCommand } from '../../../lib/commands/cross-cutting.commands';
import { IdempotencyResult } from '../../../lib/domain';
import { structuredLogFields } from '../../../lib/observability/structured-log-fields';
import {
  IDEMPOTENCY_REPOSITORY,
  IdempotencyRepository,
} from '../repository/idempotency.repository';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(
    @Inject(IDEMPOTENCY_REPOSITORY)
    private readonly repository: IdempotencyRepository,
  ) {}

  async checkAndRecord(
    command: CheckIdempotencyCommand,
    workflowId?: string,
  ): Promise<IdempotencyResult> {
    const existing = await this.repository.findByKey(command.idempotencyKey);
    if (existing) {
      this.logger.log(
        structuredLogFields('idempotency.duplicate', {
          idempotency_key: command.idempotencyKey,
          request_id: command.requestId,
          scope: command.scope,
          workflow_id: existing.workflow_id ?? undefined,
        }),
      );

      return {
        isDuplicate: true,
        key: command.idempotencyKey,
        scope: command.scope,
        workflowId: existing.workflow_id ?? undefined,
      };
    }

    const result = await this.repository.tryInsert(
      command.idempotencyKey,
      command.scope,
      workflowId,
    );

    if (result.duplicate) {
      const row = await this.repository.findByKey(command.idempotencyKey);
      this.logger.log(
        structuredLogFields('idempotency.duplicate', {
          idempotency_key: command.idempotencyKey,
          request_id: command.requestId,
          scope: command.scope,
          workflow_id: row?.workflow_id ?? undefined,
        }),
      );

      return {
        isDuplicate: true,
        key: command.idempotencyKey,
        scope: command.scope,
        workflowId: row?.workflow_id ?? undefined,
      };
    }

    this.logger.log(
      structuredLogFields('idempotency.recorded', {
        idempotency_key: command.idempotencyKey,
        request_id: command.requestId,
        scope: command.scope,
        workflow_id: workflowId,
      }),
    );

    return {
      isDuplicate: false,
      key: command.idempotencyKey,
      scope: command.scope,
      workflowId,
    };
  }

  async linkWorkflowId(key: string, workflowId: string): Promise<void> {
    await this.repository.linkWorkflowId(key, workflowId);
    this.logger.log(
      structuredLogFields('idempotency.linked', {
        idempotency_key: key,
        workflow_id: workflowId,
      }),
    );
  }
}
