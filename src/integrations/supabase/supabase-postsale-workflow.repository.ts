import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  CreateWorkflowInput,
  PostsaleWorkflowRepository,
  UpdateTemplateMatchInput,
  UpdateDealContextInput,
} from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import { Workflow } from '../../lib/domain';
import { TemplateMatchStatus, WorkflowStatus } from '../../lib/enums';
import { PostsaleWorkflowRow } from '../../lib/persistence';
import { toPostsaleWorkflow } from '../../lib/persistence/mappers/postsale-workflow.mapper';
import { SUPABASE_CLIENT } from './supabase.tokens';

@Injectable()
export class SupabasePostsaleWorkflowRepository extends PostsaleWorkflowRepository {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient,
  ) {
    super();
  }

  async findById(workflowId: string): Promise<Workflow | null> {
    const row = await this.findRowById(workflowId);
    return row ? toPostsaleWorkflow(row) : null;
  }

  async findByBitrixDealId(dealId: string): Promise<Workflow | null> {
    const { data, error } = await this.client
      .from('postsale_workflows')
      .select('*')
      .eq('bitrix_deal_id', dealId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find workflow by deal id: ${error.message}`);
    }

    return data ? toPostsaleWorkflow(data as PostsaleWorkflowRow) : null;
  }

  async create(input: CreateWorkflowInput): Promise<Workflow> {
    const { data, error } = await this.client
      .from('postsale_workflows')
      .insert({
        bitrix_deal_id: input.bitrixDealId,
        status: input.status,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create workflow: ${error.message}`);
    }

    return toPostsaleWorkflow(data as PostsaleWorkflowRow);
  }

  async updateStatus(
    workflowId: string,
    status: WorkflowStatus,
  ): Promise<void> {
    const { error } = await this.client
      .from('postsale_workflows')
      .update({ status })
      .eq('id', workflowId);

    if (error) {
      throw new Error(`Failed to update workflow status: ${error.message}`);
    }
  }

  async updateTemplateMatchStatus(
    workflowId: string,
    templateMatchStatus: TemplateMatchStatus,
  ): Promise<void> {
    const { error } = await this.client
      .from('postsale_workflows')
      .update({ template_match_status: templateMatchStatus })
      .eq('id', workflowId);

    if (error) {
      throw new Error(
        `Failed to update template match status: ${error.message}`,
      );
    }
  }

  async updateDealContext(
    workflowId: string,
    input: UpdateDealContextInput,
  ): Promise<void> {
    const { error } = await this.client
      .from('postsale_workflows')
      .update({
        deal_context_json: input.dealContext,
        product: input.product,
        status: input.status,
      })
      .eq('id', workflowId);

    if (error) {
      throw new Error(`Failed to update deal context: ${error.message}`);
    }
  }

  async updateTemplateMatch(
    workflowId: string,
    input: UpdateTemplateMatchInput,
  ): Promise<void> {
    const { error } = await this.client
      .from('postsale_workflows')
      .update({
        template_match_status: input.templateMatchStatus,
        status: input.status,
        ...(input.carTemplateId !== undefined
          ? { car_template_id: input.carTemplateId }
          : {}),
      })
      .eq('id', workflowId);

    if (error) {
      throw new Error(`Failed to update template match: ${error.message}`);
    }
  }

  async incrementFollowUp(
    workflowId: string,
    followedUpAt: Date,
  ): Promise<void> {
    const row = await this.findRowById(workflowId);
    if (!row) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const { error } = await this.client
      .from('postsale_workflows')
      .update({
        follow_up_count: (row.follow_up_count ?? 0) + 1,
        last_follow_up_at: followedUpAt.toISOString(),
      })
      .eq('id', workflowId);

    if (error) {
      throw new Error(`Failed to increment follow-up count: ${error.message}`);
    }
  }

  async findRowById(id: string): Promise<PostsaleWorkflowRow | null> {
    const { data, error } = await this.client
      .from('postsale_workflows')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find workflow: ${error.message}`);
    }

    return (data as PostsaleWorkflowRow | null) ?? null;
  }
}
