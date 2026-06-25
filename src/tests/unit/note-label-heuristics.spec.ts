import {
  inferExpectedNoteOutcome,
  isClassificationLabelCompatibleWithSourceNote,
  sourceNoteRequiresOptionSelection,
} from '../../domains/langflow/parsers/note-label-heuristics';
import { RequirementLabel } from '../../lib/enums';

describe('note-label-heuristics', () => {
  it('detects trunk level option selection', () => {
    const note =
      'Proszę o zaznaczenie który poziom bagażnika robimy, górny czy dolny?';

    expect(sourceNoteRequiresOptionSelection(note)).toBe(true);
    expect(inferExpectedNoteOutcome(note)).toEqual({
      kind: 'classify',
      label: RequirementLabel.OPTION_SELECTION,
    });
  });

  it('rejects YES_NO_INFO for option-selection notes', () => {
    const note =
      'Proszę o sprawdzenie jaki poziom bagażnika robimy: górny czy dolny? (zalecamy górny)';

    expect(
      isClassificationLabelCompatibleWithSourceNote(
        note,
        RequirementLabel.YES_NO_INFO,
      ),
    ).toBe(false);
    expect(
      isClassificationLabelCompatibleWithSourceNote(
        note,
        RequirementLabel.OPTION_SELECTION,
      ),
    ).toBe(true);
  });

  it('keeps yes/no for simple confirmation questions', () => {
    const note =
      'Proszę o sprawdzenie czy są kanały powietrzne pod fotelami z przodu?';

    expect(sourceNoteRequiresOptionSelection(note)).toBe(false);
    expect(inferExpectedNoteOutcome(note)).toEqual({
      kind: 'classify',
      label: RequirementLabel.YES_NO_INFO,
    });
  });
});
