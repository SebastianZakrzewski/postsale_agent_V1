import { WorkflowRequirementRow } from '../../../lib/persistence';

export type CreateWorkflowRequirementInput = Omit<
  WorkflowRequirementRow,
  'id' | 'created_at' | 'updated_at' | 'customer_question'
> & {
  customer_question?: string | null;
};

export abstract class WorkflowRequirementRepository {
  abstract findByWorkflowId(
    workflowId: string,
  ): Promise<WorkflowRequirementRow[]>;
  abstract create(
    row: CreateWorkflowRequirementInput,
  ): Promise<WorkflowRequirementRow>;
  abstract createMany(
    rows: CreateWorkflowRequirementInput[],
  ): Promise<WorkflowRequirementRow[]>;
  abstract findById(id: string): Promise<WorkflowRequirementRow | null>;
  abstract updateStatus(
    id: string,
    status: WorkflowRequirementRow['status'],
  ): Promise<WorkflowRequirementRow>;
}

export const WORKFLOW_REQUIREMENT_REPOSITORY = Symbol(
  'WORKFLOW_REQUIREMENT_REPOSITORY',
);
