import { MessageLinkRepository } from '../../domains/email/repository/message.repository';
import { MessageLinkRow } from '../../lib/persistence';

export class InMemoryMessageLinkRepository extends MessageLinkRepository {
  private readonly rows: MessageLinkRow[] = [];

  async createMany(
    inputRows: Array<Omit<MessageLinkRow, 'id' | 'created_at'>>,
  ): Promise<MessageLinkRow[]> {
    const created = inputRows.map((row, index) => {
      const persisted: MessageLinkRow = {
        id: `link-${this.rows.length + index + 1}`,
        ...row,
        created_at: new Date().toISOString(),
      };
      return persisted;
    });
    this.rows.push(...created);
    return created;
  }

  async findByMessageId(messageId: string): Promise<MessageLinkRow[]> {
    return this.rows.filter((row) => row.message_id === messageId);
  }

  all(): MessageLinkRow[] {
    return [...this.rows];
  }
}
