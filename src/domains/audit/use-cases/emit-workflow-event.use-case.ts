import { Injectable } from '@nestjs/common';
import { EmitWorkflowEventCommand } from '../../../lib/commands/cross-cutting.commands';
import { WorkflowEvent } from '../../../lib/domain';
import { AuditService } from '../services/audit.service';

@Injectable()
export class EmitWorkflowEventUseCase {
  constructor(private readonly auditService: AuditService) {}

  execute(command: EmitWorkflowEventCommand): Promise<WorkflowEvent> {
    return this.auditService.emit(command);
  }
}
