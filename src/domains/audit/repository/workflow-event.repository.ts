import { WorkflowEventType } from '../../../lib/enums';
import { WorkflowEventRow } from '../../../lib/persistence';

export interface AppendWorkflowEventInput {
  workflowId: string;
  eventType: WorkflowEventType;
  statusBefore?: string;
  statusAfter?: string;
  payload?: Record<string, unknown>;
  requestId?: string;
}

export abstract class WorkflowEventRepository {
  abstract append(input: AppendWorkflowEventInput): Promise<WorkflowEventRow>;
  abstract findByWorkflowId(workflowId: string): Promise<WorkflowEventRow[]>;
}

export const WORKFLOW_EVENT_REPOSITORY = Symbol('WORKFLOW_EVENT_REPOSITORY');
