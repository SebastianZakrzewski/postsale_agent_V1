import { WorkflowRequirementRow } from '../../../lib/persistence';

export abstract class WorkflowRequirementRepository {
  abstract findByWorkflowId(
    workflowId: string,
  ): Promise<WorkflowRequirementRow[]>;
  abstract create(
    row: Omit<WorkflowRequirementRow, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<WorkflowRequirementRow>;
  abstract createMany(
    rows: Array<
      Omit<WorkflowRequirementRow, 'id' | 'created_at' | 'updated_at'>
    >,
  ): Promise<WorkflowRequirementRow[]>;
}

export const WORKFLOW_REQUIREMENT_REPOSITORY = Symbol(
  'WORKFLOW_REQUIREMENT_REPOSITORY',
);
