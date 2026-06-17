import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  CreateSideEffectRecordInput,
  SideEffectRecordRepository,
} from '../../domains/side-effects/repository/side-effect-record.repository';
import { SideEffectRecordStatus } from '../../lib/enums';
import { SideEffectRecordRow } from '../../lib/persistence';
import { SUPABASE_CLIENT } from './supabase.tokens';

@Injectable()
export class SupabaseSideEffectRecordRepository extends SideEffectRecordRepository {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient,
  ) {
    super();
  }

  async createPending(
    input: CreateSideEffectRecordInput,
  ): Promise<SideEffectRecordRow> {
    const { data, error } = await this.client
      .from('side_effect_records')
      .insert({
        workflow_id: input.workflowId,
        side_effect_type: input.sideEffectType,
        idempotency_key: input.idempotencyKey,
        status: SideEffectRecordStatus.PENDING,
        retry_allowed: false,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create side effect record: ${error.message}`);
    }

    return data as SideEffectRecordRow;
  }

  async findByIdempotencyKey(key: string): Promise<SideEffectRecordRow | null> {
    const { data, error } = await this.client
      .from('side_effect_records')
      .select('*')
      .eq('idempotency_key', key)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find side effect record: ${error.message}`);
    }

    return data as SideEffectRecordRow | null;
  }

  async updateStatus(
    id: string,
    status: SideEffectRecordStatus,
    errorCode?: string,
    retryAllowed?: boolean,
    providerResponse?: Record<string, unknown>,
  ): Promise<void> {
    const update: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (errorCode !== undefined) {
      update.error_code = errorCode;
    }
    if (retryAllowed !== undefined) {
      update.retry_allowed = retryAllowed;
    }
    if (providerResponse !== undefined) {
      update.provider_response = providerResponse;
    }

    const { error } = await this.client
      .from('side_effect_records')
      .update(update)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update side effect record: ${error.message}`);
    }
  }
}
