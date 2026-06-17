import { WorkflowEventType } from '../../../lib/enums';
import { WorkflowEventRow } from '../../../lib/persistence';

export interface AppendWorkflowEventInput {
  workflowId: string;
  eventType: WorkflowEventType;
  payload?: Record<string, unknown>;
}

export abstract class WorkflowEventRepository {
  abstract append(input: AppendWorkflowEventInput): Promise<void>;
  abstract findByWorkflowId(workflowId: string): Promise<WorkflowEventRow[]>;
}

export const WORKFLOW_EVENT_REPOSITORY = Symbol('WORKFLOW_EVENT_REPOSITORY');
