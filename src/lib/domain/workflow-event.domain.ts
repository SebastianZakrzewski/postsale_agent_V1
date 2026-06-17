import { WorkflowEventType } from '../enums';

export interface WorkflowEvent {
  id: string;
  workflowId: string;
  eventType: WorkflowEventType;
  payload: Record<string, unknown> | null;
  createdAt: Date;
}
