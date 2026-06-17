import { SideEffectType, WorkflowEventType } from '../enums';

export interface CheckIdempotencyCommand {
  idempotencyKey: string;
  scope: string;
  requestId?: string;
}

export interface RecordSideEffectCommand {
  workflowId: string;
  sideEffectType: SideEffectType;
  idempotencyKey: string;
  requestId?: string;
}

export interface EmitWorkflowEventCommand {
  workflowId: string;
  eventType: WorkflowEventType;
  statusBefore?: string;
  statusAfter?: string;
  payload?: Record<string, unknown>;
  requestId?: string;
}
