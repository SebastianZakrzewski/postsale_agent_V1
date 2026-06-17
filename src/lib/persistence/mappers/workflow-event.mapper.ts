import { WorkflowEvent } from '../../domain';
import { WorkflowEventRow } from '../rows';

export function toWorkflowEvent(row: WorkflowEventRow): WorkflowEvent {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    eventType: row.event_type,
    payload: row.payload,
    createdAt: new Date(row.created_at),
  };
}
