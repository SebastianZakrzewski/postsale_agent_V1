import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { LangflowRunRepository } from '../../domains/langflow/repository/langflow-run.repository';
import { LangflowRunRow } from '../../lib/persistence';
import { SUPABASE_CLIENT } from './supabase.tokens';

@Injectable()
export class SupabaseLangflowRunRepository extends LangflowRunRepository {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient,
  ) {
    super();
  }

  async create(
    row: Omit<LangflowRunRow, 'id' | 'created_at'>,
  ): Promise<LangflowRunRow> {
    const { data, error } = await this.client
      .from('langflow_runs')
      .insert(row)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create langflow run: ${error.message}`);
    }

    return data as LangflowRunRow;
  }

  async findByWorkflowId(workflowId: string): Promise<LangflowRunRow[]> {
    const { data, error } = await this.client
      .from('langflow_runs')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to find langflow runs: ${error.message}`);
    }

    return (data ?? []) as LangflowRunRow[];
  }
}
