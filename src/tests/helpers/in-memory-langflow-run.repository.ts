import { LangflowRunRepository } from '../../domains/langflow/repository/langflow-run.repository';
import { LangflowRunRow } from '../../lib/persistence';

export class InMemoryLangflowRunRepository extends LangflowRunRepository {
  private readonly rows: LangflowRunRow[] = [];

  async create(
    row: Omit<LangflowRunRow, 'id' | 'created_at'>,
  ): Promise<LangflowRunRow> {
    const persisted: LangflowRunRow = {
      id: `lf-${this.rows.length + 1}`,
      ...row,
      created_at: new Date().toISOString(),
    };
    this.rows.push(persisted);
    return persisted;
  }

  async findByWorkflowId(workflowId: string): Promise<LangflowRunRow[]> {
    return this.rows.filter((row) => row.workflow_id === workflowId);
  }

  all(): LangflowRunRow[] {
    return [...this.rows];
  }
}
