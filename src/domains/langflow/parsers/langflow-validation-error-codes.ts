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
  | 'label_source_note_mismatch'
  | 'classification_validation_failed';

export type LangflowValidationErrorCode =
  | ClassifyNotesParseErrorCode
  | EmailDraftParseErrorCode
  | ClassificationValidationErrorCode
  | AnalyzeReplyParseErrorCode
  | EvidenceGuardErrorCode
  | 'low_confidence_email_draft'
  | 'unsafe_reply'
  | 'low_confidence'
  | 'unknown_requirement_id'
  | 'evidence_guard_failed';

export type AnalyzeReplyParseErrorCode =
  | 'missing_requirement_updates'
  | 'invalid_requirement_update'
  | 'missing_requirement_id'
  | 'unknown_requirement_status'
  | 'missing_analysis_reason'
  | 'invalid_confidence'
  | 'invalid_evidence_proposal'
  | 'unknown_evidence_type'
  | 'invalid_proposed_next_action'
  | 'analyze_reply_parse_failed';

export type EvidenceGuardErrorCode =
  | 'valid_without_evidence'
  | 'missing_text_fragment_content'
  | 'missing_attachment_source_ref'
  | 'unknown_attachment_source_ref'
  | 'missing_link_source_ref'
  | 'unknown_link_source_ref';
