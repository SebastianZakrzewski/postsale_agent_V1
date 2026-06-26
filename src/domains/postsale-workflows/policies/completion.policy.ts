import { Workflow } from '../../../lib/domain';
import {
  TemplateMatchStatus,
  RequirementStatus,
  WorkflowStatus,
} from '../../../lib/enums';
import { WorkflowRequirementRow } from '../../../lib/persistence';

export type CompletionPolicyOutcome = 'PASS' | 'INCOMPLETE' | 'ESCALATE';

export interface CompletionPolicyInput {
  workflow: Workflow;
  requirements: WorkflowRequirementRow[];
  evidenceCountByRequirementId: Map<string, number>;
  langflowAnalysisValid: boolean;
  bitrixCompletionSideEffectSucceeded: boolean;
}

export interface CompletionPolicyResult {
  outcome: CompletionPolicyOutcome;
  reason?: string;
}

const INCOMPLETE_STATUSES: RequirementStatus[] = [
  RequirementStatus.PENDING,
  RequirementStatus.PARTIAL,
  RequirementStatus.UNCLEAR,
];

const TERMINAL_WORKFLOW_STATUSES = new Set<WorkflowStatus>([
  WorkflowStatus.COMPLETED,
  WorkflowStatus.ESCALATED,
  WorkflowStatus.FAILED,
]);

export function evaluateCompletionPolicy(
  input: CompletionPolicyInput,
): CompletionPolicyResult {
  const { workflow, requirements } = input;

  if (TERMINAL_WORKFLOW_STATUSES.has(workflow.status)) {
    return { outcome: 'ESCALATE', reason: 'workflow_terminal' };
  }

  if (workflow.templateMatchStatus !== TemplateMatchStatus.MATCHED) {
    return { outcome: 'INCOMPLETE', reason: 'template_not_matched' };
  }

  if (!input.langflowAnalysisValid) {
    return { outcome: 'INCOMPLETE', reason: 'langflow_analysis_invalid' };
  }

  if (input.bitrixCompletionSideEffectSucceeded) {
    return {
      outcome: 'ESCALATE',
      reason: 'bitrix_completion_already_executed',
    };
  }

  if (requirements.length === 0) {
    return { outcome: 'INCOMPLETE', reason: 'requirements_missing' };
  }

  for (const requirement of requirements) {
    if (INCOMPLETE_STATUSES.includes(requirement.status)) {
      return { outcome: 'INCOMPLETE', reason: 'requirements_incomplete' };
    }

    if (requirement.status === RequirementStatus.VALID) {
      const evidenceCount =
        input.evidenceCountByRequirementId.get(requirement.id) ?? 0;
      if (evidenceCount === 0) {
        return { outcome: 'INCOMPLETE', reason: 'valid_without_evidence' };
      }
    }
  }

  return { outcome: 'PASS' };
}
