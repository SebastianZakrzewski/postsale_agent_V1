import { Inject, Injectable } from '@nestjs/common';
import { EscalateWorkflowCommand } from '../../../lib/commands/workflow.commands';
import { Workflow } from '../../../lib/domain';
import { WorkflowEventType, WorkflowStatus } from '../../../lib/enums';
import { EmitWorkflowEventUseCase } from '../../audit/use-cases/emit-workflow-event.use-case';
import {
  POSTSALE_WORKFLOW_REPOSITORY,
  PostsaleWorkflowRepository,
} from '../repository/postsale-workflow.repository';

@Injectable()
export class EscalateWorkflowUseCase {
  constructor(
    @Inject(POSTSALE_WORKFLOW_REPOSITORY)
    private readonly workflowRepository: PostsaleWorkflowRepository,
    private readonly emitWorkflowEventUseCase: EmitWorkflowEventUseCase,
  ) {}

  async execute(command: EscalateWorkflowCommand): Promise<Workflow> {
    const existing = await this.workflowRepository.findById(command.workflowId);
    if (!existing) {
      throw new Error(`Workflow not found: ${command.workflowId}`);
    }

    if (command.templateMatchStatus) {
      await this.workflowRepository.updateTemplateMatchStatus(
        command.workflowId,
        command.templateMatchStatus,
      );
    }

    await this.workflowRepository.updateStatus(
      command.workflowId,
      WorkflowStatus.ESCALATED,
    );

    await this.emitWorkflowEventUseCase.execute({
      workflowId: command.workflowId,
      eventType: WorkflowEventType.WORKFLOW_ESCALATED,
      statusBefore: existing.status,
      statusAfter: WorkflowStatus.ESCALATED,
      payload: {
        reason: command.reason,
        templateMatchStatus: command.templateMatchStatus ?? null,
      },
      requestId: command.requestId,
    });

    const updated = await this.workflowRepository.findById(command.workflowId);
    if (!updated) {
      throw new Error(
        `Workflow not found after escalation: ${command.workflowId}`,
      );
    }

    return updated;
  }
}
