import { RequirementLabel } from '../../../lib/enums';
import { ClassifiedRequirementDraft } from '../../../lib/domain';
import { LangflowOutput } from '../../../integrations/langflow/langflow.types';
import { ClassifyNotesParseErrorCode } from './langflow-validation-error-codes';

export class ClassifyNotesParseError extends Error {
  readonly code: ClassifyNotesParseErrorCode;

  constructor(code: ClassifyNotesParseErrorCode) {
    super(code);
    this.name = 'ClassifyNotesParseError';
    this.code = code;
  }
}

interface RawClassification {
  source_field?: unknown;
  source_note?: unknown;
  requirement_label?: unknown;
  question_text?: unknown;
  classification_reason?: unknown;
  confidence?: unknown;
  unsafe?: unknown;
}

function readString(value: unknown, code: ClassifyNotesParseErrorCode): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ClassifyNotesParseError(code);
  }
  return value.trim();
}

function readConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ClassifyNotesParseError('invalid_confidence');
  }
  return value;
}

function readRequirementLabel(value: unknown): RequirementLabel {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ClassifyNotesParseError('missing_requirement_label');
  }
  const label = value.trim();
  if (!Object.values(RequirementLabel).includes(label as RequirementLabel)) {
    throw new ClassifyNotesParseError('unknown_requirement_label');
  }
  return label as RequirementLabel;
}

export interface ParsedClassifyNotesOutput {
  classifications: ClassifiedRequirementDraft[];
  unsafeNotes: string[];
}

export function parseClassifyNotesOutput(
  output: LangflowOutput,
): ParsedClassifyNotesOutput {
  const raw = output.raw;
  const unsafeNotes = Array.isArray(raw.unsafe_notes)
    ? raw.unsafe_notes.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    : [];

  const items = raw.classifications;
  if (!Array.isArray(items)) {
    throw new ClassifyNotesParseError('missing_classifications');
  }

  const classifications = items.map((item: RawClassification) => {
    if (item.unsafe === true) {
      throw new ClassifyNotesParseError('classification_marked_unsafe');
    }

    return {
      sourceField: readString(item.source_field, 'missing_source_field'),
      sourceNote: readString(item.source_note, 'missing_source_note'),
      requirementLabel: readRequirementLabel(item.requirement_label),
      questionText: readString(item.question_text, 'missing_question_text'),
      classificationReason: readString(
        item.classification_reason,
        'missing_classification_reason',
      ),
      confidence: readConfidence(item.confidence),
    };
  });

  return { classifications, unsafeNotes };
}
