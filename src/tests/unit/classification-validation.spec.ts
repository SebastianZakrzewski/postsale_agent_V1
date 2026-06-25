import { validateClassifications } from '../../domains/langflow/parsers/classification-validation';
import { ClassifiedRequirementDraft } from '../../lib/domain';
import { RequirementLabel } from '../../lib/enums';

function buildDraft(
  overrides: Partial<ClassifiedRequirementDraft> = {},
): ClassifiedRequirementDraft {
  return {
    sourceField: 'notes_front_3d',
    sourceNote: 'Front note text',
    requirementLabel: RequirementLabel.YES_NO_INFO,
    questionText: 'Please confirm: Front note text',
    classificationReason: 'test',
    confidence: 0.9,
    ...overrides,
  };
}

describe('validateClassifications (baseline case 15)', () => {
  it('rejects confidence below 0.75', () => {
    const result = validateClassifications(
      [buildDraft({ confidence: 0.5 })],
      [],
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('low_confidence');
  });

  it('rejects unsafe_notes array entries (baseline case 4)', () => {
    const result = validateClassifications([buildDraft()], ['unsafe content']);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unsafe_notes');
  });

  it('rejects question_text that drifts from source_note meaning', () => {
    const result = validateClassifications(
      [
        buildDraft({
          sourceNote: 'Original note',
          questionText: 'Completely different question',
        }),
      ],
      [],
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('question_text_drift');
  });

  it('accepts valid classifications', () => {
    const result = validateClassifications([buildDraft()], []);

    expect(result).toEqual({ ok: true });
  });
});
