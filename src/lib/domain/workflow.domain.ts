import { WorkflowStatus, TemplateMatchStatus } from '../enums';

export interface Workflow {
  id: string;
  bitrixDealId: string;
  status: WorkflowStatus;
  templateMatchStatus: TemplateMatchStatus | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Requirement {
  id: string;
  workflowId: string;
  label: string;
  status: string;
  sourceNote: string | null;
}

export interface Evidence {
  id: string;
  requirementId: string;
  evidenceType: string;
  sourceRef: string | null;
}
