export interface CheckIdempotencyCommand {
  idempotencyKey: string;
  scope: string;
}

export interface RecordSideEffectCommand {
  workflowId: string;
  sideEffectType: string;
  idempotencyKey: string;
}

export interface EmitWorkflowEventCommand {
  workflowId: string;
  eventType: string;
  payload?: Record<string, unknown>;
}
