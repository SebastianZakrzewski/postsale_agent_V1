import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { RequirementEvidenceRepository } from '../../domains/requirements/repository/requirement-evidence.repository';
import { RequirementEvidenceRow } from '../../lib/persistence';
import { SUPABASE_CLIENT } from './supabase.tokens';

@Injectable()
export class SupabaseRequirementEvidenceRepository extends RequirementEvidenceRepository {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient,
  ) {
    super();
  }

  async createMany(
    rows: Array<
      Omit<RequirementEvidenceRow, 'id' | 'created_at' | 'updated_at'>
    >,
  ): Promise<RequirementEvidenceRow[]> {
    if (rows.length === 0) {
      return [];
    }

    const { data, error } = await this.client
      .from('requirement_evidence')
      .insert(rows)
      .select('*');

    if (error) {
      throw new Error(
        `Failed to create requirement evidence: ${error.message}`,
      );
    }

    return (data ?? []) as RequirementEvidenceRow[];
  }

  async findByWorkflowId(
    workflowId: string,
  ): Promise<RequirementEvidenceRow[]> {
    const { data, error } = await this.client
      .from('requirement_evidence')
      .select('*')
      .eq('workflow_id', workflowId);

    if (error) {
      throw new Error(`Failed to list requirement evidence: ${error.message}`);
    }

    return (data ?? []) as RequirementEvidenceRow[];
  }
}
