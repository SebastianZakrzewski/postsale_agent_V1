import { TemplateMatchStatus, WorkflowStatus } from '../enums';

export interface StartWorkflowResult {
  workflowId: string;
  status: WorkflowStatus;
  templateMatchStatus: TemplateMatchStatus | null;
  isDuplicate: boolean;
}
