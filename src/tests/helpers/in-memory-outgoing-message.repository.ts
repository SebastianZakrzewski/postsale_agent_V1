import { OutgoingMessageRepository } from '../../domains/email/repository/message.repository';
import { OutgoingMessageRow } from '../../lib/persistence';

export class InMemoryOutgoingMessageRepository extends OutgoingMessageRepository {
  private readonly rows: OutgoingMessageRow[] = [];

  async create(
    row: Omit<OutgoingMessageRow, 'id' | 'created_at'>,
  ): Promise<OutgoingMessageRow> {
    const persisted: OutgoingMessageRow = {
      id: `out-${this.rows.length + 1}`,
      ...row,
      created_at: new Date().toISOString(),
    };
    this.rows.push(persisted);
    return persisted;
  }

  async findByProviderMessageId(
    providerMessageId: string,
  ): Promise<OutgoingMessageRow | null> {
    return (
      this.rows.find((row) => row.provider_message_id === providerMessageId) ??
      null
    );
  }

  all(): OutgoingMessageRow[] {
    return [...this.rows];
  }
}
