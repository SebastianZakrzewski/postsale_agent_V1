import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { DuplicateCustomerMessageError } from '../../domains/email/errors/customer-message.errors';
import { CustomerMessageRepository } from '../../domains/email/repository/message.repository';
import { CustomerMessageRow } from '../../lib/persistence';
import { SUPABASE_CLIENT } from './supabase.tokens';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class SupabaseCustomerMessageRepository extends CustomerMessageRepository {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient,
  ) {
    super();
  }

  async create(
    row: Omit<CustomerMessageRow, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<CustomerMessageRow> {
    const { data, error } = await this.client
      .from('customer_messages')
      .insert(row)
      .select('*')
      .single();

    if (error) {
      if (
        error.code === UNIQUE_VIOLATION &&
        row.external_message_id !== null &&
        row.external_message_id !== undefined
      ) {
        throw new DuplicateCustomerMessageError(row.external_message_id);
      }
      throw new Error(`Failed to create customer message: ${error.message}`);
    }

    return data as CustomerMessageRow;
  }

  async findByWorkflowId(workflowId: string): Promise<CustomerMessageRow[]> {
    const { data, error } = await this.client
      .from('customer_messages')
      .select('*')
      .eq('workflow_id', workflowId);

    if (error) {
      throw new Error(`Failed to list customer messages: ${error.message}`);
    }

    return (data ?? []) as CustomerMessageRow[];
  }

  async findByExternalMessageId(
    externalMessageId: string,
  ): Promise<CustomerMessageRow | null> {
    const { data, error } = await this.client
      .from('customer_messages')
      .select('*')
      .eq('external_message_id', externalMessageId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Failed to find customer message by external id: ${error.message}`,
      );
    }

    return (data as CustomerMessageRow | null) ?? null;
  }
}
