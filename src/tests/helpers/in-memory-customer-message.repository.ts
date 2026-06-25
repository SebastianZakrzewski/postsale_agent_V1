import { CustomerMessageRepository } from '../../domains/email/repository/message.repository';
import { DuplicateCustomerMessageError } from '../../domains/email/errors/customer-message.errors';
import { CustomerMessageRow } from '../../lib/persistence';

export class InMemoryCustomerMessageRepository extends CustomerMessageRepository {
  private readonly rows: CustomerMessageRow[] = [];

  async create(
    row: Omit<CustomerMessageRow, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<CustomerMessageRow> {
    if (row.external_message_id) {
      const duplicate = this.rows.find(
        (existing) => existing.external_message_id === row.external_message_id,
      );
      if (duplicate) {
        throw new DuplicateCustomerMessageError(row.external_message_id);
      }
    }

    const now = new Date().toISOString();
    const persisted: CustomerMessageRow = {
      id: `msg-${this.rows.length + 1}`,
      ...row,
      created_at: now,
      updated_at: now,
    };
    this.rows.push(persisted);
    return persisted;
  }

  async findByWorkflowId(workflowId: string): Promise<CustomerMessageRow[]> {
    return this.rows.filter((row) => row.workflow_id === workflowId);
  }

  async findByExternalMessageId(
    externalMessageId: string,
  ): Promise<CustomerMessageRow | null> {
    return (
      this.rows.find((row) => row.external_message_id === externalMessageId) ??
      null
    );
  }

  all(): CustomerMessageRow[] {
    return [...this.rows];
  }
}
