import { DealContext, Workflow } from '../../../lib/domain';
import { TemplateMatchStatus, WorkflowStatus } from '../../../lib/enums';
import { PostsaleWorkflowRow } from '../../../lib/persistence';

export interface CreateWorkflowInput {
  bitrixDealId: string;
  status: WorkflowStatus;
}

export interface UpdateDealContextInput {
  dealContext: DealContext;
  product: string;
  status: WorkflowStatus;
}

export interface UpdateTemplateMatchInput {
  templateMatchStatus: TemplateMatchStatus;
  status: WorkflowStatus;
  carTemplateId?: string | null;
}

export abstract class PostsaleWorkflowRepository {
  abstract findById(workflowId: string): Promise<Workflow | null>;
  abstract findByBitrixDealId(dealId: string): Promise<Workflow | null>;
  abstract create(input: CreateWorkflowInput): Promise<Workflow>;
  abstract updateStatus(
    workflowId: string,
    status: WorkflowStatus,
  ): Promise<void>;
  abstract updateTemplateMatchStatus(
    workflowId: string,
    templateMatchStatus: TemplateMatchStatus,
  ): Promise<void>;
  abstract updateDealContext(
    workflowId: string,
    input: UpdateDealContextInput,
  ): Promise<void>;
  abstract updateTemplateMatch(
    workflowId: string,
    input: UpdateTemplateMatchInput,
  ): Promise<void>;
  abstract incrementFollowUp(
    workflowId: string,
    followedUpAt: Date,
  ): Promise<void>;
  abstract findRowById(id: string): Promise<PostsaleWorkflowRow | null>;
}

export const POSTSALE_WORKFLOW_REPOSITORY = Symbol(
  'POSTSALE_WORKFLOW_REPOSITORY',
);
