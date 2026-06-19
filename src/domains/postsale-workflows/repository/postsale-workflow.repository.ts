import { Workflow } from '../../../lib/domain';
import { TemplateMatchStatus, WorkflowStatus } from '../../../lib/enums';
import { PostsaleWorkflowRow } from '../../../lib/persistence';

export interface CreateWorkflowInput {
  bitrixDealId: string;
  status: WorkflowStatus;
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
  abstract findRowById(id: string): Promise<PostsaleWorkflowRow | null>;
}

export const POSTSALE_WORKFLOW_REPOSITORY = Symbol(
  'POSTSALE_WORKFLOW_REPOSITORY',
);
