import { RequirementEvidenceRepository } from '../../domains/requirements/repository/requirement-evidence.repository';
import { RequirementEvidenceRow } from '../../lib/persistence';

export class InMemoryRequirementEvidenceRepository extends RequirementEvidenceRepository {
  private readonly rows: RequirementEvidenceRow[] = [];

  async createMany(
    inputRows: Array<
      Omit<RequirementEvidenceRow, 'id' | 'created_at' | 'updated_at'>
    >,
  ): Promise<RequirementEvidenceRow[]> {
    const now = new Date().toISOString();
    const created = inputRows.map((row, index) => {
      const persisted: RequirementEvidenceRow = {
        id: `ev-${this.rows.length + index + 1}`,
        ...row,
        created_at: now,
        updated_at: now,
      };
      return persisted;
    });
    this.rows.push(...created);
    return created;
  }

  async findByWorkflowId(
    workflowId: string,
  ): Promise<RequirementEvidenceRow[]> {
    return this.rows.filter((row) => row.workflow_id === workflowId);
  }

  all(): RequirementEvidenceRow[] {
    return [...this.rows];
  }
}
