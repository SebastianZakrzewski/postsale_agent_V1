import { Injectable } from '@nestjs/common';
import { CheckIdempotencyCommand } from '../../../lib/commands/cross-cutting.commands';
import { IdempotencyResult } from '../../../lib/domain';
import { IdempotencyService } from '../services/idempotency.service';

@Injectable()
export class CheckIdempotencyUseCase {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  execute(
    command: CheckIdempotencyCommand,
    workflowId?: string,
  ): Promise<IdempotencyResult> {
    return this.idempotencyService.checkAndRecord(command, workflowId);
  }

  linkWorkflowId(idempotencyKey: string, workflowId: string): Promise<void> {
    return this.idempotencyService.linkWorkflowId(idempotencyKey, workflowId);
  }
}
