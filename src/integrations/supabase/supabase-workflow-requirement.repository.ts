import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { WorkflowRequirementRepository } from '../../domains/requirements/repository/workflow-requirement.repository';
import { WorkflowRequirementRow } from '../../lib/persistence';
import { SUPABASE_CLIENT } from './supabase.tokens';

@Injectable()
export class SupabaseWorkflowRequirementRepository extends WorkflowRequirementRepository {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient,
  ) {
    super();
  }

  async findByWorkflowId(
    workflowId: string,
  ): Promise<WorkflowRequirementRow[]> {
    const { data, error } = await this.client
      .from('workflow_requirements')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to find workflow requirements: ${error.message}`);
    }

    return (data ?? []) as WorkflowRequirementRow[];
  }

  async create(
    row: Omit<WorkflowRequirementRow, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<WorkflowRequirementRow> {
    const rows = await this.createMany([row]);
    return rows[0]!;
  }

  async createMany(
    rows: Array<
      Omit<WorkflowRequirementRow, 'id' | 'created_at' | 'updated_at'>
    >,
  ): Promise<WorkflowRequirementRow[]> {
    if (rows.length === 0) {
      return [];
    }

    const { data, error } = await this.client
      .from('workflow_requirements')
      .insert(rows)
      .select('*');

    if (error) {
      throw new Error(
        `Failed to create workflow requirements: ${error.message}`,
      );
    }

    return (data ?? []) as WorkflowRequirementRow[];
  }
}
