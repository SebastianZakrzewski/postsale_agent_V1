import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  CreateWorkflowRequirementInput,
  WorkflowRequirementRepository,
} from '../../domains/requirements/repository/workflow-requirement.repository';
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
    row: CreateWorkflowRequirementInput,
  ): Promise<WorkflowRequirementRow> {
    const rows = await this.createMany([row]);
    return rows[0]!;
  }

  async createMany(
    rows: CreateWorkflowRequirementInput[],
  ): Promise<WorkflowRequirementRow[]> {
    if (rows.length === 0) {
      return [];
    }

    const { data, error } = await this.client
      .from('workflow_requirements')
      .insert(
        rows.map((row) => ({
          ...row,
          customer_question: row.customer_question ?? null,
        })),
      )
      .select('*');

    if (error) {
      throw new Error(
        `Failed to create workflow requirements: ${error.message}`,
      );
    }

    return (data ?? []) as WorkflowRequirementRow[];
  }

  async findById(id: string): Promise<WorkflowRequirementRow | null> {
    const { data, error } = await this.client
      .from('workflow_requirements')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find workflow requirement: ${error.message}`);
    }

    return (data as WorkflowRequirementRow | null) ?? null;
  }

  async updateStatus(
    id: string,
    status: WorkflowRequirementRow['status'],
  ): Promise<WorkflowRequirementRow> {
    const { data, error } = await this.client
      .from('workflow_requirements')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(
        `Failed to update workflow requirement: ${error.message}`,
      );
    }

    return data as WorkflowRequirementRow;
  }
}
