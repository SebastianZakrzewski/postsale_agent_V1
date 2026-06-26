import {
  EvidenceType,
  RequirementLabel,
  RequirementStatus,
} from '../../../lib/enums';
import { RequirementUpdateDraft } from '../../../lib/domain/reply-analysis.domain';
import { WorkflowRequirementRow } from '../../../lib/persistence';

export function collectAcceptedPhotoAttachmentRefs(
  updates: RequirementUpdateDraft[],
  requirements: WorkflowRequirementRow[],
): string[] {
  const refs = new Set<string>();

  for (const update of updates) {
    if (update.proposedStatus !== RequirementStatus.VALID) {
      continue;
    }

    const requirement = requirements.find(
      (row) => row.id === update.requirementId,
    );
    if (!requirement || requirement.label !== RequirementLabel.PHOTO_REQUIRED) {
      continue;
    }

    for (const proposal of update.evidenceProposals) {
      if (
        proposal.evidenceType === EvidenceType.EMAIL_ATTACHMENT &&
        proposal.sourceRef
      ) {
        refs.add(proposal.sourceRef);
      }
    }
  }

  return [...refs];
}
