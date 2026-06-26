import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { MessageAttachmentRepository } from '../../domains/email/repository/message.repository';
import { MessageAttachmentRow } from '../../lib/persistence';
import { SUPABASE_CLIENT } from './supabase.tokens';

@Injectable()
export class SupabaseMessageAttachmentRepository extends MessageAttachmentRepository {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient,
  ) {
    super();
  }

  async createMany(
    rows: Array<Omit<MessageAttachmentRow, 'id' | 'created_at'>>,
  ): Promise<MessageAttachmentRow[]> {
    if (rows.length === 0) {
      return [];
    }

    const { data, error } = await this.client
      .from('message_attachments')
      .insert(rows)
      .select('*');

    if (error) {
      throw new Error(`Failed to create message attachments: ${error.message}`);
    }

    return (data ?? []) as MessageAttachmentRow[];
  }

  async findByMessageId(messageId: string): Promise<MessageAttachmentRow[]> {
    const { data, error } = await this.client
      .from('message_attachments')
      .select('*')
      .eq('message_id', messageId);

    if (error) {
      throw new Error(`Failed to list message attachments: ${error.message}`);
    }

    return (data ?? []) as MessageAttachmentRow[];
  }
}
