import {
  EvidenceType,
  RequirementLabel,
  RequirementStatus,
} from '../../lib/enums';
import { collectAcceptedPhotoAttachmentRefs } from '../../domains/bitrix/services/accepted-photo-attachment-refs';
import { RequirementUpdateDraft } from '../../lib/domain/reply-analysis.domain';

describe('collectAcceptedPhotoAttachmentRefs', () => {
  const photoRequirement = {
    id: 'req-photo',
    label: RequirementLabel.PHOTO_REQUIRED,
    status: RequirementStatus.PENDING,
  };

  const otherRequirement = {
    id: 'req-text',
    label: RequirementLabel.TEXT_CONFIRMATION,
    status: RequirementStatus.PENDING,
  };

  it('collects EMAIL_ATTACHMENT refs when PHOTO_REQUIRED becomes VALID', () => {
    const updates: RequirementUpdateDraft[] = [
      {
        requirementId: 'req-photo',
        proposedStatus: RequirementStatus.VALID,
        confidence: 0.95,
        analysisReason: 'photo attachment accepted',
        evidenceProposals: [
          {
            evidenceType: EvidenceType.EMAIL_ATTACHMENT,
            sourceRef: 'gmail:msg-1:bin-1',
            content: null,
          },
        ],
      },
    ];

    expect(
      collectAcceptedPhotoAttachmentRefs(updates, [
        photoRequirement as never,
        otherRequirement as never,
      ]),
    ).toEqual(['gmail:msg-1:bin-1']);
  });

  it('ignores non-photo requirements and non-valid updates', () => {
    const updates: RequirementUpdateDraft[] = [
      {
        requirementId: 'req-text',
        proposedStatus: RequirementStatus.VALID,
        confidence: 0.95,
        analysisReason: 'text accepted',
        evidenceProposals: [
          {
            evidenceType: EvidenceType.EMAIL_ATTACHMENT,
            sourceRef: 'gmail:msg-1:bin-1',
            content: null,
          },
        ],
      },
      {
        requirementId: 'req-photo',
        proposedStatus: RequirementStatus.PARTIAL,
        confidence: 0.8,
        analysisReason: 'photo incomplete',
        evidenceProposals: [],
      },
    ];

    expect(
      collectAcceptedPhotoAttachmentRefs(updates, [
        photoRequirement as never,
        otherRequirement as never,
      ]),
    ).toEqual([]);
  });
});
