import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { OutgoingMessageRepository } from '../../domains/email/repository/message.repository';
import { OutgoingMessageRow } from '../../lib/persistence';
import { SUPABASE_CLIENT } from './supabase.tokens';

@Injectable()
export class SupabaseOutgoingMessageRepository extends OutgoingMessageRepository {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient,
  ) {
    super();
  }

  async create(
    row: Omit<OutgoingMessageRow, 'id' | 'created_at'>,
  ): Promise<OutgoingMessageRow> {
    const { data, error } = await this.client
      .from('outgoing_messages')
      .insert(row)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create outgoing message: ${error.message}`);
    }

    return data as OutgoingMessageRow;
  }
}
