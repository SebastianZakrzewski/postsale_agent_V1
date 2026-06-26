import { EvidenceType, RequirementStatus } from '../../../lib/enums';
import {
  EvidenceProposalDraft,
  RequirementUpdateDraft,
} from '../../../lib/domain/reply-analysis.domain';
import { MessageAttachmentRow, MessageLinkRow } from '../../../lib/persistence';

export type EvidenceGuardRejectionReason =
  | 'valid_without_evidence'
  | 'missing_text_fragment_content'
  | 'missing_attachment_source_ref'
  | 'unknown_attachment_source_ref'
  | 'missing_link_source_ref'
  | 'unknown_link_source_ref';

export class EvidenceGuardError extends Error {
  constructor(public readonly code: EvidenceGuardRejectionReason) {
    super(code);
    this.name = 'EvidenceGuardError';
  }
}

export interface EvidenceGuardContext {
  attachments: MessageAttachmentRow[];
  links: MessageLinkRow[];
}

export function validateRequirementUpdateEvidence(
  update: RequirementUpdateDraft,
  context: EvidenceGuardContext,
): void {
  if (update.proposedStatus === RequirementStatus.VALID) {
    if (update.evidenceProposals.length === 0) {
      throw new EvidenceGuardError('valid_without_evidence');
    }
  }

  for (const proposal of update.evidenceProposals) {
    validateEvidenceProposal(proposal, context);
  }
}

function validateEvidenceProposal(
  proposal: EvidenceProposalDraft,
  context: EvidenceGuardContext,
): void {
  switch (proposal.evidenceType) {
    case EvidenceType.TEXT_FRAGMENT:
      if (!proposal.content || proposal.content.trim().length === 0) {
        throw new EvidenceGuardError('missing_text_fragment_content');
      }
      return;
    case EvidenceType.EMAIL_ATTACHMENT: {
      if (!proposal.sourceRef) {
        throw new EvidenceGuardError('missing_attachment_source_ref');
      }
      const attachment = context.attachments.find(
        (row) => row.storage_ref === proposal.sourceRef,
      );
      if (!attachment) {
        throw new EvidenceGuardError('unknown_attachment_source_ref');
      }
      return;
    }
    case EvidenceType.EXTERNAL_LINK: {
      if (!proposal.sourceRef) {
        throw new EvidenceGuardError('missing_link_source_ref');
      }
      const link = context.links.find((row) => row.url === proposal.sourceRef);
      if (!link) {
        throw new EvidenceGuardError('unknown_link_source_ref');
      }
      return;
    }
    case EvidenceType.MANUAL_APPROVAL:
      return;
    default:
      throw new EvidenceGuardError('valid_without_evidence');
  }
}

export function validateAllRequirementUpdates(
  updates: RequirementUpdateDraft[],
  context: EvidenceGuardContext,
): void {
  for (const update of updates) {
    validateRequirementUpdateEvidence(update, context);
  }
}
