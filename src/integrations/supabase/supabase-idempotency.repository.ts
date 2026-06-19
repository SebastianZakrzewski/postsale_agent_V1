import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  IdempotencyInsertResult,
  IdempotencyRepository,
} from '../../domains/idempotency/repository/idempotency.repository';
import { IdempotencyKeyRow } from '../../lib/persistence';
import { SUPABASE_CLIENT } from './supabase.tokens';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class SupabaseIdempotencyRepository extends IdempotencyRepository {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient,
  ) {
    super();
  }

  async findByKey(key: string): Promise<IdempotencyKeyRow | null> {
    const { data, error } = await this.client
      .from('idempotency_keys')
      .select('*')
      .eq('idempotency_key', key)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find idempotency key: ${error.message}`);
    }

    return data as IdempotencyKeyRow | null;
  }

  async tryInsert(
    key: string,
    scope: string,
    workflowId?: string,
  ): Promise<IdempotencyInsertResult> {
    const { error } = await this.client.from('idempotency_keys').insert({
      idempotency_key: key,
      scope,
      workflow_id: workflowId ?? null,
    });

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return { inserted: false, duplicate: true };
      }
      throw new Error(`Failed to insert idempotency key: ${error.message}`);
    }

    return { inserted: true, duplicate: false };
  }

  async linkWorkflowId(key: string, workflowId: string): Promise<void> {
    const { error } = await this.client
      .from('idempotency_keys')
      .update({ workflow_id: workflowId })
      .eq('idempotency_key', key);

    if (error) {
      throw new Error(
        `Failed to link workflow to idempotency key: ${error.message}`,
      );
    }
  }
}
