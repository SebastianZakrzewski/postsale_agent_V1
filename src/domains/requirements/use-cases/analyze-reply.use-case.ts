import { Inject, Injectable } from '@nestjs/common';
import { AnalyzeReplyCommand } from '../../../lib/commands/workflow.commands';
import {
  buildCapabilityResult,
  CapabilityResult,
  ProposedNextAction,
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
import {
  LANGFLOW_CONFIDENCE_THRESHOLD,
  LANGFLOW_FLOW_ANALYZE_CUSTOMER_REPLY,
} from '../../langflow/config/langflow-flow-names';
import {
  AnalyzeReplyParseError,
  parseAnalyzeReplyOutput,
} from '../../langflow/parsers/analyze-reply.parser';
import { LangflowValidationErrorCode } from '../../langflow/parsers/langflow-validation-error-codes';
import { LangflowRunRecorderService } from '../../langflow/services/langflow-run-recorder.service';
import {
  CUSTOMER_MESSAGE_REPOSITORY,
  MESSAGE_ATTACHMENT_REPOSITORY,
  MESSAGE_LINK_REPOSITORY,
  CustomerMessageRepository,
  MessageAttachmentRepository,
  MessageLinkRepository,
} from '../../email/repository/message.repository';
import { EscalateToPendingBitrixUseCase } from '../../postsale-workflows/use-cases/escalate-to-pending-bitrix.use-case';
import { ExecutePendingSideEffectsUseCase } from '../../postsale-workflows/use-cases/execute-pending-side-effects.use-case';
import { GetWorkflowContextUseCase } from '../../postsale-workflows/use-cases/get-workflow-context.use-case';
import {
  POSTSALE_WORKFLOW_REPOSITORY,
  PostsaleWorkflowRepository,
} from '../../postsale-workflows/repository/postsale-workflow.repository';
import {
  REQUIREMENT_EVIDENCE_REPOSITORY,
  RequirementEvidenceRepository,
} from '../repository/requirement-evidence.repository';
import {
  WORKFLOW_REQUIREMENT_REPOSITORY,
  WorkflowRequirementRepository,
} from '../repository/workflow-requirement.repository';
import {
  EvidenceGuardError,
  validateAllRequirementUpdates,
} from '../services/evidence-guard.service';
import { mapRequirementForLangflow } from '../services/requirement-langflow.mapper';
import { applyOptionSelectionReplyHeuristic } from '../services/option-selection-reply-heuristic.service';
import { buildReplyEffectivenessMetrics } from '../services/reply-effectiveness-metrics';
import { isOptionSelectionHeuristicEnabled } from '../../../lib/config/agent-effectiveness.config';
import { RequirementUpdateDraft } from '../../../lib/domain/reply-analysis.domain';
import { WorkflowRequirementRow } from '../../../lib/persistence';
import { AnalyzeReplyOutcome } from './analyze-reply.outcome';
@Injectable()
export class AnalyzeReplyUseCase {
  constructor(
    private readonly getWorkflowContextUseCase: GetWorkflowContextUseCase,
    @Inject(WORKFLOW_REQUIREMENT_REPOSITORY)
    private readonly requirementRepository: WorkflowRequirementRepository,
    @Inject(CUSTOMER_MESSAGE_REPOSITORY)
    private readonly customerMessageRepository: CustomerMessageRepository,
    @Inject(MESSAGE_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepository: MessageAttachmentRepository,
    @Inject(MESSAGE_LINK_REPOSITORY)
    private readonly linkRepository: MessageLinkRepository,
    @Inject(REQUIREMENT_EVIDENCE_REPOSITORY)
    private readonly evidenceRepository: RequirementEvidenceRepository,
    @Inject(POSTSALE_WORKFLOW_REPOSITORY)
    private readonly workflowRepository: PostsaleWorkflowRepository,
    @Inject(LANGFLOW_PROVIDER)
    private readonly langflowProvider: LangflowProvider,
    private readonly langflowRunRecorder: LangflowRunRecorderService,
    private readonly emitWorkflowEventUseCase: EmitWorkflowEventUseCase,
    private readonly escalateToPendingBitrixUseCase: EscalateToPendingBitrixUseCase,
    private readonly executePendingSideEffectsUseCase: ExecutePendingSideEffectsUseCase,
  ) {}

  async execute(command: AnalyzeReplyCommand): Promise<AnalyzeReplyOutcome> {
    const { workflow } = await this.getWorkflowContextUseCase.execute({
      workflowId: command.workflowId,
    });

    if (workflow.status !== WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY) {
      return {
        type: 'rejected',
        reason: `unexpected_workflow_status_${workflow.status}`,
      };
    }

    const messages = await this.customerMessageRepository.findByWorkflowId(
      command.workflowId,
    );
    const message = messages.find(
      (row) => row.id === command.customerMessageId,
    );
    if (!message) {
      return { type: 'rejected', reason: 'customer_message_not_found' };
    }

    const requirements = await this.requirementRepository.findByWorkflowId(
      command.workflowId,
    );
    const attachments = await this.attachmentRepository.findByMessageId(
      command.customerMessageId,
    );
    const links = await this.linkRepository.findByMessageId(
      command.customerMessageId,
    );

    const langflowOutput = await this.langflowProvider.invoke(
      LANGFLOW_FLOW_ANALYZE_CUSTOMER_REPLY,
      {
        workflowId: command.workflowId,
        customerMessageId: command.customerMessageId,
        requirements: requirements.map((row) => mapRequirementForLangflow(row)),
        message: {
          subject: message.subject,
          body: message.body,
        },
        attachments: attachments.map((row) => ({
          storage_ref: row.storage_ref,
          filename: row.filename,
          content_type: row.content_type,
        })),
        links: links.map((row) => ({
          url: row.url,
        })),
      },
    );

    let analysis;
    try {
      analysis = parseAnalyzeReplyOutput(langflowOutput);
    } catch (error) {
      const reason =
        error instanceof AnalyzeReplyParseError
          ? error.code
          : 'analyze_reply_parse_failed';
      await this.recordLangflowRun(command, false, reason);
      return this.escalate(command, reason);
    }

    if (analysis.unsafe) {
      await this.recordLangflowRun(command, false, 'unsafe_reply');
      return this.escalate(command, 'unsafe_reply');
    }

    if (isOptionSelectionHeuristicEnabled()) {
      analysis = applyOptionSelectionReplyHeuristic({
        analysis,
        requirements,
        messageBody: message.body ?? '',
      });
      analysis = {
        ...analysis,
        proposedNextAction: recomputeProposedNextAction(requirements, analysis),
      };
    }

    try {
      validateAllRequirementUpdates(analysis.requirementUpdates, {
        attachments,
        links,
      });
    } catch (error) {
      const reason =
        error instanceof EvidenceGuardError
          ? error.code
          : 'evidence_guard_failed';
      await this.recordLangflowRun(command, false, reason);
      if (reason === 'valid_without_evidence') {
        return { type: 'rejected', reason };
      }
      return this.escalate(command, reason);
    }

    for (const update of analysis.requirementUpdates) {
      if (update.confidence < LANGFLOW_CONFIDENCE_THRESHOLD) {
        await this.recordLangflowRun(command, false, 'low_confidence');
        return this.escalate(command, 'low_confidence');
      }

      const requirement = requirements.find(
        (row) => row.id === update.requirementId,
      );
      if (!requirement) {
        await this.recordLangflowRun(command, false, 'unknown_requirement_id');
        return this.escalate(command, 'unknown_requirement_id');
      }
    }

    await this.recordLangflowRun(command, true, null);

    const evidenceRows = analysis.requirementUpdates.flatMap((update) =>
      update.evidenceProposals.map((proposal) => ({
        requirement_id: update.requirementId,
        workflow_id: command.workflowId,
        evidence_type: proposal.evidenceType,
        source_ref: proposal.sourceRef,
        content: proposal.content,
      })),
    );
    const evidence = await this.evidenceRepository.createMany(evidenceRows);

    const updatedRequirementIds: string[] = [];
    for (const update of analysis.requirementUpdates) {
      if (update.proposedStatus === RequirementStatus.VALID) {
        const hasEvidence = update.evidenceProposals.length > 0;
        if (!hasEvidence) {
          return { type: 'rejected', reason: 'valid_without_evidence' };
        }
      }

      await this.requirementRepository.updateStatus(
        update.requirementId,
        update.proposedStatus,
      );
      updatedRequirementIds.push(update.requirementId);
    }

    await this.workflowRepository.updateStatus(
      command.workflowId,
      WorkflowStatus.REQUIREMENTS_UPDATED,
    );

    await this.emitWorkflowEventUseCase.execute({
      workflowId: command.workflowId,
      eventType: WorkflowEventType.REQUIREMENT_STATUSES_UPDATED,
      statusBefore: WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY,
      statusAfter: WorkflowStatus.REQUIREMENTS_UPDATED,
      payload: {
        updatedRequirementIds,
        evidenceIds: evidence.map((row) => row.id),
      },
      requestId: command.requestId,
    });

    await this.emitWorkflowEventUseCase.execute({
      workflowId: command.workflowId,
      eventType: WorkflowEventType.REPLY_ANALYSIS_ACCEPTED,
      statusBefore: WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY,
      statusAfter: WorkflowStatus.REQUIREMENTS_UPDATED,
      payload: {
        proposedNextAction: analysis.proposedNextAction,
        customerMessageId: command.customerMessageId,
        effectivenessMetrics: buildReplyEffectivenessMetrics({
          proposedNextAction: analysis.proposedNextAction,
          requirements,
          attachmentCount: attachments.length,
        }),
      },
      requestId: command.requestId,
    });

    const updated = await this.workflowRepository.findById(command.workflowId);
    if (!updated) {
      throw new Error(
        `Workflow not found after analyze: ${command.workflowId}`,
      );
    }

    return {
      type: 'analyzed',
      capability: this.buildAnalyzeCapabilityResult(
        updated,
        analysis.proposedNextAction,
      ),
      workflow: updated,
      proposedNextAction: analysis.proposedNextAction,
      updatedRequirementIds,
      evidenceIds: evidence.map((row) => row.id),
    };
  }

  private buildAnalyzeCapabilityResult(
    workflow: Parameters<typeof buildCapabilityResult>[0],
    proposedNextAction: ProposedNextAction,
  ): CapabilityResult {
    const base = buildCapabilityResult(workflow);
    return {
      ...base,
      allowedNextActions: mapProposedNextAction(proposedNextAction),
    };
  }

  private async recordLangflowRun(
    command: AnalyzeReplyCommand,
    parsedSuccess: boolean,
    validationErrors: LangflowValidationErrorCode | null,
  ): Promise<void> {
    await this.langflowRunRecorder.record({
      workflowId: command.workflowId,
      flowName: LANGFLOW_FLOW_ANALYZE_CUSTOMER_REPLY,
      requestId: command.requestId,
      parsedSuccess,
      validationErrors,
    });
  }

  private async escalate(
    command: AnalyzeReplyCommand,
    reason: string,
  ): Promise<AnalyzeReplyOutcome> {
    const pending = await this.escalateToPendingBitrixUseCase.execute({
      workflowId: command.workflowId,
      reason,
      requestId: command.requestId,
    });

    const executed = await this.executePendingSideEffectsUseCase.execute({
      workflowId: command.workflowId,
      requestId: command.requestId,
    });

    const workflow =
      executed.type === 'escalated' || executed.type === 'blocked'
        ? executed.workflow
        : pending.workflow;

    return {
      type: 'escalated',
      capability: buildCapabilityResult(workflow),
      workflow,
      reason,
    };
  }
}

function mapProposedNextAction(action: ProposedNextAction): string[] {
  switch (action) {
    case 'COMPLETE':
      return ['propose_completion'];
    case 'FOLLOWUP':
      return ['propose_followup'];
    case 'MANUAL_REVIEW':
      return ['propose_manual_review'];
    default:
      return [];
  }
}

const INCOMPLETE_AFTER_ANALYSIS: RequirementStatus[] = [
  RequirementStatus.PENDING,
  RequirementStatus.PARTIAL,
  RequirementStatus.UNCLEAR,
];

function recomputeProposedNextAction(
  requirements: WorkflowRequirementRow[],
  analysis: { requirementUpdates: RequirementUpdateDraft[] },
): ProposedNextAction {
  const statusById = new Map(requirements.map((row) => [row.id, row.status]));
  for (const update of analysis.requirementUpdates) {
    statusById.set(update.requirementId, update.proposedStatus);
  }

  for (const status of statusById.values()) {
    if (INCOMPLETE_AFTER_ANALYSIS.includes(status)) {
      return 'FOLLOWUP';
    }
  }

  return 'COMPLETE';
}
