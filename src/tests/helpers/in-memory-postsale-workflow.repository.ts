import {
  CreateWorkflowInput,
  PostsaleWorkflowRepository,
  UpdateDealContextInput,
  UpdateTemplateMatchInput,
} from '../../domains/postsale-workflows/repository/postsale-workflow.repository';
import { Workflow } from '../../lib/domain';
import { TemplateMatchStatus, WorkflowStatus } from '../../lib/enums';
import { PostsaleWorkflowRow } from '../../lib/persistence';
import { toPostsaleWorkflow } from '../../lib/persistence/mappers/postsale-workflow.mapper';

export class InMemoryPostsaleWorkflowRepository extends PostsaleWorkflowRepository {
  private readonly workflows = new Map<string, PostsaleWorkflowRow>();

  async findById(workflowId: string): Promise<Workflow | null> {
    const row = await this.findRowById(workflowId);
    return row ? toPostsaleWorkflow(row) : null;
  }

  async findByBitrixDealId(dealId: string): Promise<Workflow | null> {
    const rows = [...this.workflows.values()]
      .filter((row) => row.bitrix_deal_id === dealId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    return rows[0] ? toPostsaleWorkflow(rows[0]) : null;
  }

  async create(input: CreateWorkflowInput): Promise<Workflow> {
    const id = `workflow-${this.workflows.size + 1}`;
    const now = new Date().toISOString();
    const row: PostsaleWorkflowRow = {
      id,
      bitrix_deal_id: input.bitrixDealId,
      status: input.status,
      template_match_status: null,
      deal_context_json: null,
      product: null,
      car_template_id: null,
      created_at: now,
      updated_at: now,
    };
    this.workflows.set(id, row);
    return toPostsaleWorkflow(row);
  }

  async updateStatus(
    workflowId: string,
    status: WorkflowStatus,
  ): Promise<void> {
    const row = this.workflows.get(workflowId);
    if (!row) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    row.status = status;
    row.updated_at = new Date().toISOString();
  }

  async updateTemplateMatchStatus(
    workflowId: string,
    templateMatchStatus: TemplateMatchStatus,
  ): Promise<void> {
    const row = this.workflows.get(workflowId);
    if (!row) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    row.template_match_status = templateMatchStatus;
    row.updated_at = new Date().toISOString();
  }

  async updateDealContext(
    workflowId: string,
    input: UpdateDealContextInput,
  ): Promise<void> {
    const row = this.workflows.get(workflowId);
    if (!row) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    row.deal_context_json = { ...input.dealContext };
    row.product = input.product;
    row.status = input.status;
    row.updated_at = new Date().toISOString();
  }

  async updateTemplateMatch(
    workflowId: string,
    input: UpdateTemplateMatchInput,
  ): Promise<void> {
    const row = this.workflows.get(workflowId);
    if (!row) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    row.template_match_status = input.templateMatchStatus;
    row.status = input.status;
    if (input.carTemplateId !== undefined) {
      row.car_template_id = input.carTemplateId;
    }
    row.updated_at = new Date().toISOString();
  }

  async findRowById(id: string): Promise<PostsaleWorkflowRow | null> {
    return this.workflows.get(id) ?? null;
  }

  count(): number {
    return this.workflows.size;
  }
}
