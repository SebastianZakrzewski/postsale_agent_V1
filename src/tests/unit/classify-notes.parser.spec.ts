import { RequirementLabel } from '../../lib/enums';
import { LangflowOutput } from '../../integrations/langflow/langflow.types';
import {
  ClassifyNotesParseError,
  parseClassifyNotesOutput,
} from '../../domains/langflow/parsers/classify-notes.parser';

function classifyOutput(raw: Record<string, unknown>): LangflowOutput {
  return { flowName: 'classify-template-notes', raw };
}

describe('parseClassifyNotesOutput', () => {
  it('returns unknown_requirement_label without embedding LLM label text in error code', () => {
    expect(() =>
      parseClassifyNotesOutput(
        classifyOutput({
          classifications: [
            {
              source_field: 'notes_front_3d',
              source_note: 'Note',
              requirement_label: 'INVENTED_LABEL_FROM_LLM',
              question_text: 'Please confirm: Note',
              classification_reason: 'test',
              confidence: 0.9,
              unsafe: false,
            },
          ],
          unsafe_notes: [],
        }),
      ),
    ).toThrow(ClassifyNotesParseError);

    try {
      parseClassifyNotesOutput(
        classifyOutput({
          classifications: [
            {
              source_field: 'notes_front_3d',
              source_note: 'Note',
              requirement_label: 'INVENTED_LABEL_FROM_LLM',
              question_text: 'Please confirm: Note',
              classification_reason: 'test',
              confidence: 0.9,
              unsafe: false,
            },
          ],
          unsafe_notes: [],
        }),
      );
    } catch (error) {
      expect(error).toBeInstanceOf(ClassifyNotesParseError);
      if (error instanceof ClassifyNotesParseError) {
        expect(error.code).toBe('unknown_requirement_label');
        expect(error.message).toBe('unknown_requirement_label');
        expect(error.message).not.toContain('INVENTED_LABEL_FROM_LLM');
      }
    }
  });

  it('parses valid classification output', () => {
    const parsed = parseClassifyNotesOutput(
      classifyOutput({
        classifications: [
          {
            source_field: 'notes_front_3d',
            source_note: 'Front note',
            requirement_label: RequirementLabel.YES_NO_INFO,
            question_text: 'Please confirm: Front note',
            classification_reason: 'test',
            confidence: 0.9,
            unsafe: false,
          },
        ],
        unsafe_notes: [],
      }),
    );

    expect(parsed.classifications).toHaveLength(1);
    expect(parsed.classifications[0].requirementLabel).toBe(
      RequirementLabel.YES_NO_INFO,
    );
  });
});
