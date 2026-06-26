import { ProposedNextAction } from '../../../lib/domain';
import { RequirementLabel, RequirementStatus } from '../../../lib/enums';
import { WorkflowRequirementRow } from '../../../lib/persistence';

export interface ReplyEffectivenessMetrics {
  proposedNextAction: ProposedNextAction;
  requirementCount: number;
  validCount: number;
  partialCount: number;
  pendingCount: number;
  photoRequiredCount: number;
  attachmentCount: number;
}

export function buildReplyEffectivenessMetrics(input: {
  proposedNextAction: ProposedNextAction;
  requirements: WorkflowRequirementRow[];
  attachmentCount: number;
}): ReplyEffectivenessMetrics {
  const statuses = input.requirements.map((row) => row.status);
  return {
    proposedNextAction: input.proposedNextAction,
    requirementCount: input.requirements.length,
    validCount: statuses.filter((s) => s === RequirementStatus.VALID).length,
    partialCount: statuses.filter((s) => s === RequirementStatus.PARTIAL)
      .length,
    pendingCount: statuses.filter((s) => s === RequirementStatus.PENDING)
      .length,
    photoRequiredCount: input.requirements.filter(
      (row) => row.label === RequirementLabel.PHOTO_REQUIRED,
    ).length,
    attachmentCount: input.attachmentCount,
  };
}
