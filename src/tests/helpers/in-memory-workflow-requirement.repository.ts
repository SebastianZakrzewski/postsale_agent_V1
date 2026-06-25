import { WorkflowRequirementRepository } from '../../domains/requirements/repository/workflow-requirement.repository';
import { WorkflowRequirementRow } from '../../lib/persistence';

export class InMemoryWorkflowRequirementRepository extends WorkflowRequirementRepository {
  private readonly rows: WorkflowRequirementRow[] = [];

  async findByWorkflowId(
    workflowId: string,
  ): Promise<WorkflowRequirementRow[]> {
    return this.rows.filter((row) => row.workflow_id === workflowId);
  }

  async create(
    row: Omit<WorkflowRequirementRow, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<WorkflowRequirementRow> {
    const rows = await this.createMany([row]);
    return rows[0]!;
  }

  async createMany(
    inputRows: Array<
      Omit<WorkflowRequirementRow, 'id' | 'created_at' | 'updated_at'>
    >,
  ): Promise<WorkflowRequirementRow[]> {
    const now = new Date().toISOString();
    const created = inputRows.map((row, index) => {
      const persisted: WorkflowRequirementRow = {
        id: `req-${this.rows.length + index + 1}`,
        ...row,
        created_at: now,
        updated_at: now,
      };
      return persisted;
    });
    this.rows.push(...created);
    return created;
  }
}
