import { Inject, Injectable } from '@nestjs/common';
import { GetWorkflowContextQuery } from '../../../lib/commands/workflow.commands';
import { DealContext, Workflow } from '../../../lib/domain';
import {
  POSTSALE_WORKFLOW_REPOSITORY,
  PostsaleWorkflowRepository,
} from '../repository/postsale-workflow.repository';

export interface WorkflowContextView {
  workflow: Workflow;
  dealContext: DealContext | null;
}

@Injectable()
export class GetWorkflowContextUseCase {
  constructor(
    @Inject(POSTSALE_WORKFLOW_REPOSITORY)
    private readonly workflowRepository: PostsaleWorkflowRepository,
  ) {}

  async execute(query: GetWorkflowContextQuery): Promise<WorkflowContextView> {
    const workflow = await this.workflowRepository.findById(query.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${query.workflowId}`);
    }

    return {
      workflow,
      dealContext: workflow.dealContext,
    };
  }
}
