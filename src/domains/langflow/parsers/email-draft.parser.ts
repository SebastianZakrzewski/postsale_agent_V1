import { EmailDraft } from '../../../lib/domain';
import { LangflowOutput } from '../../../integrations/langflow/langflow.types';
import { EmailDraftParseErrorCode } from './langflow-validation-error-codes';

export class EmailDraftParseError extends Error {
  readonly code: EmailDraftParseErrorCode;

  constructor(code: EmailDraftParseErrorCode) {
    super(code);
    this.name = 'EmailDraftParseError';
    this.code = code;
  }
}

function readString(value: unknown, code: EmailDraftParseErrorCode): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new EmailDraftParseError(code);
  }
  return value.trim();
}

function readConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new EmailDraftParseError('invalid_confidence');
  }
  return value;
}

export function parseEmailDraftOutput(output: LangflowOutput): EmailDraft {
  const raw = output.raw;

  const proposedRequirementRefs = Array.isArray(raw.proposed_requirement_refs)
    ? raw.proposed_requirement_refs.filter(
        (item): item is string => typeof item === 'string',
      )
    : [];

  const bodyHtml =
    typeof raw.body_html === 'string' && raw.body_html.trim().length > 0
      ? raw.body_html.trim()
      : null;

  return {
    subject: readString(raw.subject, 'missing_subject'),
    bodyText: readString(raw.body_text, 'missing_body_text'),
    bodyHtml,
    proposedRequirementRefs,
    confidence: readConfidence(raw.confidence),
  };
}
