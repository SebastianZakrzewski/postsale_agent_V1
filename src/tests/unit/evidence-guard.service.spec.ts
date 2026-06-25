import { EvidenceType, RequirementStatus } from '../../lib/enums';
import {
  EvidenceGuardError,
  validateRequirementUpdateEvidence,
} from '../../domains/requirements/services/evidence-guard.service';

describe('evidence-guard.service', () => {
  it('baseline case 7: rejects VALID without evidence proposals', () => {
    expect(() =>
      validateRequirementUpdateEvidence(
        {
          requirementId: 'req-1',
          proposedStatus: RequirementStatus.VALID,
          evidenceProposals: [],
          confidence: 0.9,
          analysisReason: 'test',
        },
        { attachments: [], links: [] },
      ),
    ).toThrow(EvidenceGuardError);
  });

  it('accepts VALID with text fragment evidence', () => {
    expect(() =>
      validateRequirementUpdateEvidence(
        {
          requirementId: 'req-1',
          proposedStatus: RequirementStatus.VALID,
          evidenceProposals: [
            {
              evidenceType: EvidenceType.TEXT_FRAGMENT,
              sourceRef: null,
              content: 'confirmed yes',
            },
          ],
          confidence: 0.9,
          analysisReason: 'test',
        },
        { attachments: [], links: [] },
      ),
    ).not.toThrow();
  });
});
