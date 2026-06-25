import { MessageAttachmentRepository } from '../../domains/email/repository/message.repository';
import { MessageAttachmentRow } from '../../lib/persistence';

export class InMemoryMessageAttachmentRepository extends MessageAttachmentRepository {
  private readonly rows: MessageAttachmentRow[] = [];

  async createMany(
    inputRows: Array<Omit<MessageAttachmentRow, 'id' | 'created_at'>>,
  ): Promise<MessageAttachmentRow[]> {
    const created = inputRows.map((row, index) => {
      const persisted: MessageAttachmentRow = {
        id: `att-${this.rows.length + index + 1}`,
        ...row,
        created_at: new Date().toISOString(),
      };
      return persisted;
    });
    this.rows.push(...created);
    return created;
  }

  async findByMessageId(messageId: string): Promise<MessageAttachmentRow[]> {
    return this.rows.filter((row) => row.message_id === messageId);
  }

  all(): MessageAttachmentRow[] {
    return [...this.rows];
  }
}
