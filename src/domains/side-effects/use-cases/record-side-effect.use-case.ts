import { Injectable } from '@nestjs/common';
import { RecordSideEffectCommand } from '../../../lib/commands/cross-cutting.commands';
import { SideEffectRecord } from '../../../lib/domain';
import { SideEffectService } from '../services/side-effect.service';

@Injectable()
export class RecordSideEffectUseCase {
  constructor(private readonly sideEffectService: SideEffectService) {}

  execute(command: RecordSideEffectCommand): Promise<SideEffectRecord> {
    return this.sideEffectService.record(command);
  }
}
