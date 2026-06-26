import { WorkflowStatus } from '../enums';

export interface CapabilityResult {
  workflowId: string;
  status: WorkflowStatus;
  done: boolean;
  softStop: boolean;
  allowedNextActions: string[];
}
