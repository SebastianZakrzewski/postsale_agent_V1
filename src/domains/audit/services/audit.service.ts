import { Inject, Injectable, Logger } from '@nestjs/common';
import { EmitWorkflowEventCommand } from '../../../lib/commands/cross-cutting.commands';
import { WorkflowEvent } from '../../../lib/domain';
import { structuredLogFields } from '../../../lib/observability/structured-log-fields';
import { toWorkflowEvent } from '../../../lib/persistence/mappers';
import { assertValidWorkflowEventType } from '../audit-payload';
import {
  WORKFLOW_EVENT_REPOSITORY,
  WorkflowEventRepository,
} from '../repository/workflow-event.repository';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @Inject(WORKFLOW_EVENT_REPOSITORY)
    private readonly repository: WorkflowEventRepository,
  ) {}

  async emit(command: EmitWorkflowEventCommand): Promise<WorkflowEvent> {
    assertValidWorkflowEventType(command.eventType);

    const row = await this.repository.append({
      workflowId: command.workflowId,
      eventType: command.eventType,
      statusBefore: command.statusBefore,
      statusAfter: command.statusAfter,
      payload: command.payload,
      requestId: command.requestId,
    });

    this.logger.log(
      structuredLogFields('audit.event.emitted', {
        workflow_id: command.workflowId,
        request_id: command.requestId,
        event_type: command.eventType,
      }),
    );

    return toWorkflowEvent(row);
  }
}
