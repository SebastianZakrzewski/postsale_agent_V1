import { Inject, Injectable, Logger } from '@nestjs/common';
import { RecordSideEffectCommand } from '../../../lib/commands/cross-cutting.commands';
import { SideEffectRecord } from '../../../lib/domain';
import { SideEffectRecordStatus } from '../../../lib/enums';
import { structuredLogFields } from '../../../lib/observability/structured-log-fields';
import { toSideEffectRecord } from '../../../lib/persistence/mappers';
import {
  SIDE_EFFECT_RECORD_REPOSITORY,
  SideEffectRecordRepository,
} from '../repository/side-effect-record.repository';

@Injectable()
export class SideEffectService {
  private readonly logger = new Logger(SideEffectService.name);

  constructor(
    @Inject(SIDE_EFFECT_RECORD_REPOSITORY)
    private readonly repository: SideEffectRecordRepository,
  ) {}

  async record(command: RecordSideEffectCommand): Promise<SideEffectRecord> {
    const row = await this.repository.createPending({
      workflowId: command.workflowId,
      sideEffectType: command.sideEffectType,
      idempotencyKey: command.idempotencyKey,
    });

    this.logger.log(
      structuredLogFields('side_effect.recorded', {
        workflow_id: command.workflowId,
        request_id: command.requestId,
        idempotency_key: command.idempotencyKey,
        side_effect_type: command.sideEffectType,
        status: SideEffectRecordStatus.PENDING,
      }),
    );

    return toSideEffectRecord(row);
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<SideEffectRecord | null> {
    const row = await this.repository.findByIdempotencyKey(idempotencyKey);
    return row ? toSideEffectRecord(row) : null;
  }

  async markSucceeded(
    id: string,
    providerResponse?: Record<string, unknown>,
  ): Promise<void> {
    await this.repository.updateStatus(
      id,
      SideEffectRecordStatus.SUCCEEDED,
      undefined,
      false,
      providerResponse,
    );

    this.logger.log(
      structuredLogFields('side_effect.succeeded', {
        side_effect_record_id: id,
        status: SideEffectRecordStatus.SUCCEEDED,
      }),
    );
  }

  async markFailed(
    id: string,
    errorCode: string,
    retryAllowed = false,
  ): Promise<void> {
    await this.repository.updateStatus(
      id,
      SideEffectRecordStatus.FAILED,
      errorCode,
      retryAllowed,
    );

    this.logger.log(
      structuredLogFields('side_effect.failed', {
        side_effect_record_id: id,
        status: SideEffectRecordStatus.FAILED,
        error_code: errorCode,
        retry_allowed: retryAllowed,
      }),
    );
  }
}
