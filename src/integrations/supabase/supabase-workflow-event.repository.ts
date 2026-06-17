import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  AppendWorkflowEventInput,
  WorkflowEventRepository,
} from '../../domains/audit/repository/workflow-event.repository';
import { buildAuditPayload } from '../../domains/audit/audit-payload';
import { WorkflowEventRow } from '../../lib/persistence';
import { SUPABASE_CLIENT } from './supabase.tokens';

@Injectable()
export class SupabaseWorkflowEventRepository extends WorkflowEventRepository {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient,
  ) {
    super();
  }

  async append(input: AppendWorkflowEventInput): Promise<WorkflowEventRow> {
    const payload = buildAuditPayload({
      statusBefore: input.statusBefore,
      statusAfter: input.statusAfter,
      payload: input.payload,
      requestId: input.requestId,
    });

    const { data, error } = await this.client
      .from('workflow_events')
      .insert({
        workflow_id: input.workflowId,
        event_type: input.eventType,
        payload,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to append workflow event: ${error.message}`);
    }

    return data as WorkflowEventRow;
  }

  async findByWorkflowId(workflowId: string): Promise<WorkflowEventRow[]> {
    const { data, error } = await this.client
      .from('workflow_events')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to find workflow events: ${error.message}`);
    }

    return (data ?? []) as WorkflowEventRow[];
  }
}
