/** Stable codes persisted in langflow_runs.validation_errors — no LLM-derived text. */

export type ClassifyNotesParseErrorCode =
  | 'missing_classifications'
  | 'classification_marked_unsafe'
  | 'missing_source_field'
  | 'missing_source_note'
  | 'missing_requirement_label'
  | 'unknown_requirement_label'
  | 'missing_question_text'
  | 'missing_classification_reason'
  | 'invalid_confidence'
  | 'classify_parse_failed';

export type EmailDraftParseErrorCode =
  | 'missing_subject'
  | 'missing_body_text'
  | 'invalid_confidence'
  | 'email_draft_parse_failed';

export type ClassificationValidationErrorCode =
  | 'low_confidence'
  | 'unsafe_notes'
  | 'empty_classifications'
  | 'question_text_drift'
  | 'classification_validation_failed';

export type LangflowValidationErrorCode =
  | ClassifyNotesParseErrorCode
  | EmailDraftParseErrorCode
  | ClassificationValidationErrorCode
  | 'low_confidence_email_draft';
