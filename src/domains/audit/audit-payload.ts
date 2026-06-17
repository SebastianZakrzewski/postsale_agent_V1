import { WorkflowStatus, WorkflowEventType } from '../../lib/enums';

export class InvalidWorkflowEventTypeError extends Error {
  constructor(eventType: WorkflowEventType) {
    super(`Invalid workflow event type: ${eventType}`);
    this.name = 'InvalidWorkflowEventTypeError';
  }
}

export function assertValidWorkflowEventType(
  eventType: WorkflowEventType,
): void {
  const statusValues = Object.values(WorkflowStatus) as string[];
  if (statusValues.includes(eventType)) {
    throw new InvalidWorkflowEventTypeError(eventType);
  }
}

export interface AuditPayloadInput {
  statusBefore?: string;
  statusAfter?: string;
  payload?: Record<string, unknown>;
  requestId?: string;
}

export function buildAuditPayload(
  input: AuditPayloadInput,
): Record<string, unknown> | null {
  const payload: Record<string, unknown> = { ...(input.payload ?? {}) };

  if (input.statusBefore !== undefined) {
    payload.status_before = input.statusBefore;
  }
  if (input.statusAfter !== undefined) {
    payload.status_after = input.statusAfter;
  }
  if (input.requestId !== undefined) {
    payload.request_id = input.requestId;
  }

  return Object.keys(payload).length > 0 ? payload : null;
}
