import { Injectable } from '@nestjs/common';
import { SideEffectRecord } from '../../../lib/domain';
import { SideEffectRecordStatus } from '../../../lib/enums';
import { SideEffectNotRecordedError } from '../errors/side-effect.errors';
import { SideEffectService } from '../services/side-effect.service';

@Injectable()
export class SideEffectGuard {
  constructor(private readonly sideEffectService: SideEffectService) {}

  assertCanExecute(record: SideEffectRecord): void {
    if (record.status !== SideEffectRecordStatus.PENDING) {
      throw new SideEffectNotRecordedError(
        `Side effect record ${record.id} is not pending (status: ${record.status})`,
      );
    }
  }

  async assertCanExecuteByKey(
    idempotencyKey: string,
  ): Promise<SideEffectRecord> {
    const record =
      await this.sideEffectService.findByIdempotencyKey(idempotencyKey);
    if (!record) {
      throw new SideEffectNotRecordedError(
        `No side effect record found for key: ${idempotencyKey}`,
      );
    }
    this.assertCanExecute(record);
    return record;
  }
}
