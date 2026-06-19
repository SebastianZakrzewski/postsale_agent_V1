import { Inject, Injectable } from '@nestjs/common';
import { Workflow } from '../../../lib/domain';
import { WorkflowEventType, WorkflowStatus } from '../../../lib/enums';
import { EmitWorkflowEventUseCase } from '../../audit/use-cases/emit-workflow-event.use-case';
import {
  POSTSALE_WORKFLOW_REPOSITORY,
  PostsaleWorkflowRepository,
} from '../repository/postsale-workflow.repository';

export interface FailWorkflowCommand {
  workflowId: string;
  reason: string;
  requestId?: string;
  errorMessage?: string;
}

@Injectable()
export class FailWorkflowUseCase {
  constructor(
    @Inject(POSTSALE_WORKFLOW_REPOSITORY)
    private readonly workflowRepository: PostsaleWorkflowRepository,
    private readonly emitWorkflowEventUseCase: EmitWorkflowEventUseCase,
  ) {}

  async execute(command: FailWorkflowCommand): Promise<Workflow> {
    const existing = await this.workflowRepository.findById(command.workflowId);
    if (!existing) {
      throw new Error(`Workflow not found: ${command.workflowId}`);
    }

    await this.workflowRepository.updateStatus(
      command.workflowId,
      WorkflowStatus.FAILED,
    );

    await this.emitWorkflowEventUseCase.execute({
      workflowId: command.workflowId,
      eventType: WorkflowEventType.WORKFLOW_FAILED,
      statusBefore: existing.status,
      statusAfter: WorkflowStatus.FAILED,
      payload: {
        reason: command.reason,
        failureKind: 'technical',
        errorMessage: command.errorMessage ?? null,
      },
      requestId: command.requestId,
    });

    const updated = await this.workflowRepository.findById(command.workflowId);
    if (!updated) {
      throw new Error(
        `Workflow not found after failure: ${command.workflowId}`,
      );
    }

    return updated;
  }
}
