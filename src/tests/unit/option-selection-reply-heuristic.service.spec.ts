import {
  RequirementLabel,
  RequirementStatus,
  EvidenceType,
} from '../../lib/enums';
import { applyOptionSelectionReplyHeuristic } from '../../domains/requirements/services/option-selection-reply-heuristic.service';
import { WorkflowRequirementRow } from '../../lib/persistence';

function requirement(
  overrides: Partial<WorkflowRequirementRow> &
    Pick<WorkflowRequirementRow, 'id'>,
): WorkflowRequirementRow {
  return {
    workflow_id: 'wf-1',
    label: RequirementLabel.OPTION_SELECTION,
    status: RequirementStatus.PENDING,
    source_note:
      'Proszę o sprawdzenie jaki poziom bagażnika robimy: górny czy dolny?',
    customer_question: null,
    source_field: 'notes_trunk_general',
    classification_reason: null,
    confidence: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('applyOptionSelectionReplyHeuristic', () => {
  it('promotes PARTIAL to VALID when reply names explicit option', () => {
    const req = requirement({ id: 'req-1' });
    const analysis = applyOptionSelectionReplyHeuristic({
      analysis: {
        requirementUpdates: [
          {
            requirementId: 'req-1',
            proposedStatus: RequirementStatus.PARTIAL,
            evidenceProposals: [
              {
                evidenceType: EvidenceType.TEXT_FRAGMENT,
                sourceRef: null,
                content: 'Wybieram poziom górny.',
              },
            ],
            confidence: 0.86,
            analysisReason: 'partial',
          },
        ],
        unsafe: false,
        proposedNextAction: 'FOLLOWUP',
      },
      requirements: [req],
      messageBody: 'Wybieram poziom górny.',
    });

    expect(analysis.requirementUpdates[0]?.proposedStatus).toBe(
      RequirementStatus.VALID,
    );
  });

  it('leaves vague reply as PARTIAL', () => {
    const req = requirement({ id: 'req-1' });
    const analysis = applyOptionSelectionReplyHeuristic({
      analysis: {
        requirementUpdates: [
          {
            requirementId: 'req-1',
            proposedStatus: RequirementStatus.PARTIAL,
            evidenceProposals: [],
            confidence: 0.86,
            analysisReason: 'partial',
          },
        ],
        unsafe: false,
        proposedNextAction: 'FOLLOWUP',
      },
      requirements: [req],
      messageBody: 'Wybieram pierwszą opcję.',
    });

    expect(analysis.requirementUpdates[0]?.proposedStatus).toBe(
      RequirementStatus.PARTIAL,
    );
  });
});
