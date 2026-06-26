import {
  EvidenceType,
  RequirementLabel,
  RequirementStatus,
} from '../../lib/enums';
import { buildBitrixCompletionComment } from '../../domains/bitrix/services/bitrix-completion-comment.builder';

describe('buildBitrixCompletionComment', () => {
  it('includes requirement questions and evidence answers', () => {
    process.env.BITRIX_COMPLETION_STAGE_UPDATE_ENABLED = 'true';
    const requirements = [
      {
        id: 'req-1',
        workflow_id: 'wf-1',
        label: RequirementLabel.YES_NO_INFO,
        status: RequirementStatus.VALID,
        source_note: 'Czy jest gaśnica?',
        source_field: 'notes_front_3d',
        classification_reason: null,
        confidence: null,
        customer_question: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ];

    const evidence = [
      {
        id: 'ev-1',
        requirement_id: 'req-1',
        workflow_id: 'wf-1',
        evidence_type: EvidenceType.TEXT_FRAGMENT,
        source_ref: null,
        content: 'tak znajduje',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ];

    const comment = buildBitrixCompletionComment(requirements, evidence);

    expect(comment).toContain('wymagania zebrane');
    expect(comment).toContain('Zebrane odpowiedzi:');
    expect(comment).toContain('Czy jest gaśnica? → tak znajduje');
    expect(comment).toContain('Deale do dodania');
  });

  it('omits stage move when completion stage update is disabled', () => {
    delete process.env.BITRIX_COMPLETION_STAGE_UPDATE_ENABLED;
    const comment = buildBitrixCompletionComment([], []);
    expect(comment).toBe('Postsale Agent: wymagania zebrane.');
    expect(comment).not.toContain('Deale do dodania');
  });
});
