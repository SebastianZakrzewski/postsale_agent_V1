import { Inject, Injectable } from '@nestjs/common';
import { CreateRequirementsCommand } from '../../../lib/commands/workflow.commands';
import {
  buildCapabilityResult,
  ClassifiedRequirementDraft,
  Workflow,
} from '../../../lib/domain';
import {
  RequirementStatus,
  WorkflowEventType,
  WorkflowStatus,
} from '../../../lib/enums';
import {
  LANGFLOW_PROVIDER,
  LangflowProvider,
} from '../../../integrations/langflow/langflow.provider';
import { EmitWorkflowEventUseCase } from '../../audit/use-cases/emit-workflow-event.use-case';
import { CheckIdempotencyUseCase } from '../../idempotency/use-cases/check-idempotency.use-case';
import { LANGFLOW_FLOW_CLASSIFY_TEMPLATE_NOTES } from '../../langflow/config/langflow-flow-names';
import { validateClassifications } from '../../langflow/parsers/classification-validation';
import {
  ClassifyNotesParseError,
  parseClassifyNotesOutput,
} from '../../langflow/parsers/classify-notes.parser';
import { LangflowRunRecorderService } from '../../langflow/services/langflow-run-recorder.service';
import { LangflowValidationErrorCode } from '../../langflow/parsers/langflow-validation-error-codes';
import { EscalateWorkflowUseCase } from '../../postsale-workflows/use-cases/escalate-workflow.use-case';
import { GetWorkflowContextUseCase } from '../../postsale-workflows/use-cases/get-workflow-context.use-case';
import {
  POSTSALE_WORKFLOW_REPOSITORY,
  PostsaleWorkflowRepository,
} from '../../postsale-workflows/repository/postsale-workflow.repository';
import {
  WORKFLOW_REQUIREMENT_REPOSITORY,
  WorkflowRequirementRepository,
} from '../repository/workflow-requirement.repository';
import { NoteSegmentationService } from '../services/note-segmentation.service';
import { SelectedTemplateNotesResolver } from '../services/selected-template-notes.resolver';
import { CreateRequirementsOutcome } from './create-requirements.outcome';

const CREATE_REQUIREMENTS_SCOPE = 'create_requirements';

@Injectable()
export class CreateRequirementsUseCase {
  constructor(
    private readonly checkIdempotencyUseCase: CheckIdempotencyUseCase,
    private readonly getWorkflowContextUseCase: GetWorkflowContextUseCase,
    private readonly selectedTemplateNotesResolver: SelectedTemplateNotesResolver,
    private readonly noteSegmentationService: NoteSegmentationService,
    @Inject(LANGFLOW_PROVIDER)
    private readonly langflowProvider: LangflowProvider,
    private readonly langflowRunRecorder: LangflowRunRecorderService,
    @Inject(WORKFLOW_REQUIREMENT_REPOSITORY)
    private readonly requirementRepository: WorkflowRequirementRepository,
    @Inject(POSTSALE_WORKFLOW_REPOSITORY)
    private readonly workflowRepository: PostsaleWorkflowRepository,
    private readonly emitWorkflowEventUseCase: EmitWorkflowEventUseCase,
    private readonly escalateWorkflowUseCase: EscalateWorkflowUseCase,
  ) {}

  async execute(
    command: CreateRequirementsCommand,
  ): Promise<CreateRequirementsOutcome> {
    const { workflow } = await this.getWorkflowContextUseCase.execute({
      workflowId: command.workflowId,
    });

    const existingRequirements =
      await this.requirementRepository.findByWorkflowId(command.workflowId);

    if (workflow.status === WorkflowStatus.REQUIREMENTS_CREATED) {
      return {
        type: 'already_created',
        capability: buildCapabilityResult(workflow),
        workflow,
        requirementIds: existingRequirements.map((row) => row.id),
      };
    }

    if (existingRequirements.length > 0) {
      return {
        type: 'already_created',
        capability: buildCapabilityResult(workflow),
        workflow,
        requirementIds: existingRequirements.map((row) => row.id),
      };
    }

    if (workflow.status !== WorkflowStatus.TEMPLATE_MATCHED) {
      throw new Error(
        `CreateRequirements requires TEMPLATE_MATCHED, got ${workflow.status}`,
      );
    }

    const idempotencyKey = `${command.workflowId}:create_requirements`;
    const idempotencyResult = await this.checkIdempotencyUseCase.execute(
      {
        idempotencyKey,
        scope: CREATE_REQUIREMENTS_SCOPE,
        requestId: command.requestId,
      },
      command.workflowId,
    );

    if (idempotencyResult.isDuplicate) {
      const refreshedRequirements =
        await this.requirementRepository.findByWorkflowId(command.workflowId);
      const refreshedWorkflow = await this.workflowRepository.findById(
        command.workflowId,
      );
      if (!refreshedWorkflow) {
        throw new Error(`Workflow not found: ${command.workflowId}`);
      }

      if (
        refreshedWorkflow.status === WorkflowStatus.REQUIREMENTS_CREATED ||
        refreshedRequirements.length > 0
      ) {
        return {
          type: 'already_created',
          capability: buildCapabilityResult(refreshedWorkflow),
          workflow: refreshedWorkflow,
          requirementIds: refreshedRequirements.map((row) => row.id),
        };
      }

      throw new Error(
        `Create requirements idempotency duplicate before persist: ${command.workflowId}`,
      );
    }

    const notesResolution =
      await this.selectedTemplateNotesResolver.resolve(workflow);
    if (!notesResolution.ok) {
      return this.escalate(command, workflow, notesResolution.reason);
    }

    if (notesResolution.notes.length === 0) {
      return this.finalizeRequirements(command, workflow, []);
    }

    const segmentedNotes = this.noteSegmentationService.segmentNotes(
      notesResolution.notes,
    );

    const langflowOutput = await this.langflowProvider.invoke(
      LANGFLOW_FLOW_CLASSIFY_TEMPLATE_NOTES,
      {
        workflowId: command.workflowId,
        notes: segmentedNotes.map((note) => ({
          part: note.part,
          column: note.column,
          text: note.text,
        })),
        dealContext: workflow.dealContext,
      },
    );

    let parsed;
    try {
      parsed = parseClassifyNotesOutput(langflowOutput);
    } catch (error) {
      const reason =
        error instanceof ClassifyNotesParseError
          ? error.code
          : 'classify_parse_failed';
      await this.recordLangflowRun(command, false, reason);
      return this.escalate(command, workflow, reason);
    }

    const validation = validateClassifications(
      parsed.classifications,
      parsed.unsafeNotes,
    );
    if (!validation.ok) {
      const reason = validation.reason ?? 'classification_validation_failed';
      await this.recordLangflowRun(command, false, reason);
      return this.escalate(command, workflow, reason);
    }

    await this.recordLangflowRun(command, true, null);

    return this.finalizeRequirements(command, workflow, parsed.classifications);
  }

  private async recordLangflowRun(
    command: CreateRequirementsCommand,
    parsedSuccess: boolean,
    validationErrors: LangflowValidationErrorCode | null,
  ): Promise<void> {
    await this.langflowRunRecorder.record({
      workflowId: command.workflowId,
      flowName: LANGFLOW_FLOW_CLASSIFY_TEMPLATE_NOTES,
      requestId: command.requestId,
      parsedSuccess,
      validationErrors,
    });
  }

  private async finalizeRequirements(
    command: CreateRequirementsCommand,
    workflow: Workflow,
    classifications: ClassifiedRequirementDraft[],
  ): Promise<CreateRequirementsOutcome> {
    const rows =
      classifications.length === 0
        ? []
        : await this.requirementRepository.createMany(
            classifications.map((item) => ({
              workflow_id: command.workflowId,
              label: item.requirementLabel,
              status: RequirementStatus.PENDING,
              source_note: item.sourceNote,
              source_field: item.sourceField,
              classification_reason: item.classificationReason,
              confidence: item.confidence,
            })),
          );

    await this.workflowRepository.updateStatus(
      command.workflowId,
      WorkflowStatus.REQUIREMENTS_CREATED,
    );

    await this.emitWorkflowEventUseCase.execute({
      workflowId: command.workflowId,
      eventType: WorkflowEventType.REQUIREMENTS_CLASSIFIED,
      statusBefore: workflow.status,
      statusAfter: WorkflowStatus.REQUIREMENTS_CREATED,
      payload: {
        requirementCount: rows.length,
      },
      requestId: command.requestId,
    });

    await this.emitWorkflowEventUseCase.execute({
      workflowId: command.workflowId,
      eventType: WorkflowEventType.WORKFLOW_REQUIREMENTS_CREATED,
      statusBefore: workflow.status,
      statusAfter: WorkflowStatus.REQUIREMENTS_CREATED,
      payload: {
        requirementIds: rows.map((row) => row.id),
      },
      requestId: command.requestId,
    });

    const updated = await this.workflowRepository.findById(command.workflowId);
    if (!updated) {
      throw new Error(
        `Workflow not found after requirements: ${command.workflowId}`,
      );
    }

    return {
      type: 'created',
      capability: buildCapabilityResult(updated),
      workflow: updated,
      requirementIds: rows.map((row) => row.id),
    };
  }

  private async escalate(
    command: CreateRequirementsCommand,
    workflow: { status: WorkflowStatus },
    reason: string,
  ): Promise<CreateRequirementsOutcome> {
    const escalated = await this.escalateWorkflowUseCase.execute({
      workflowId: command.workflowId,
      reason,
      requestId: command.requestId,
    });

    return {
      type: 'escalated',
      capability: buildCapabilityResult(escalated),
      workflow: escalated,
      reason,
    };
  }
}
