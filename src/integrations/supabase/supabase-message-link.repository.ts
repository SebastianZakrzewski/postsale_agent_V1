import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { MessageLinkRepository } from '../../domains/email/repository/message.repository';
import { MessageLinkRow } from '../../lib/persistence';
import { SUPABASE_CLIENT } from './supabase.tokens';

@Injectable()
export class SupabaseMessageLinkRepository extends MessageLinkRepository {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient,
  ) {
    super();
  }

  async createMany(
    rows: Array<Omit<MessageLinkRow, 'id' | 'created_at'>>,
  ): Promise<MessageLinkRow[]> {
    if (rows.length === 0) {
      return [];
    }

    const { data, error } = await this.client
      .from('message_links')
      .insert(rows)
      .select('*');

    if (error) {
      throw new Error(`Failed to create message links: ${error.message}`);
    }

    return (data ?? []) as MessageLinkRow[];
  }

  async findByMessageId(messageId: string): Promise<MessageLinkRow[]> {
    const { data, error } = await this.client
      .from('message_links')
      .select('*')
      .eq('message_id', messageId);

    if (error) {
      throw new Error(`Failed to list message links: ${error.message}`);
    }

    return (data ?? []) as MessageLinkRow[];
  }
}
