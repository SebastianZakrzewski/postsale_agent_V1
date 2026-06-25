import { ClassifiedRequirementDraft } from '../../../lib/domain';
import { LANGFLOW_CONFIDENCE_THRESHOLD } from '../config/langflow-flow-names';

export type ClassificationValidationFailureReason =
  | 'low_confidence'
  | 'unsafe_notes'
  | 'empty_classifications'
  | 'question_text_drift';

export interface ClassificationValidationResult {
  ok: boolean;
  reason?: ClassificationValidationFailureReason;
}

function preservesSourceNoteMeaning(
  sourceNote: string,
  questionText: string,
): boolean {
  const normalizedSource = sourceNote.trim().toLowerCase();
  const normalizedQuestion = questionText.trim().toLowerCase();
  return normalizedQuestion.includes(normalizedSource);
}

export function validateClassifications(
  classifications: ClassifiedRequirementDraft[],
  unsafeNotes: string[],
): ClassificationValidationResult {
  if (unsafeNotes.length > 0) {
    return { ok: false, reason: 'unsafe_notes' };
  }

  if (classifications.length === 0) {
    return { ok: false, reason: 'empty_classifications' };
  }

  for (const item of classifications) {
    if (item.confidence < LANGFLOW_CONFIDENCE_THRESHOLD) {
      return { ok: false, reason: 'low_confidence' };
    }

    if (!preservesSourceNoteMeaning(item.sourceNote, item.questionText)) {
      return { ok: false, reason: 'question_text_drift' };
    }
  }

  return { ok: true };
}
