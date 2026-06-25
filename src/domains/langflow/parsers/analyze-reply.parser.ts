import { EvidenceType, RequirementStatus } from '../../../lib/enums';
import {
  EvidenceProposalDraft,
  ProposedNextAction,
  ReplyAnalysisResult,
  RequirementUpdateDraft,
} from '../../../lib/domain/reply-analysis.domain';
import { LangflowOutput } from '../../../integrations/langflow/langflow.types';
import { AnalyzeReplyParseErrorCode } from './langflow-validation-error-codes';

export class AnalyzeReplyParseError extends Error {
  readonly code: AnalyzeReplyParseErrorCode;

  constructor(code: AnalyzeReplyParseErrorCode) {
    super(code);
    this.name = 'AnalyzeReplyParseError';
    this.code = code;
  }
}

function readString(value: unknown, code: AnalyzeReplyParseErrorCode): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AnalyzeReplyParseError(code);
  }
  return value.trim();
}

function readConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new AnalyzeReplyParseError('invalid_confidence');
  }
  return value;
}

function readRequirementStatus(value: unknown): RequirementStatus {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AnalyzeReplyParseError('unknown_requirement_status');
  }
  const status = value.trim();
  if (!Object.values(RequirementStatus).includes(status as RequirementStatus)) {
    throw new AnalyzeReplyParseError('unknown_requirement_status');
  }
  return status as RequirementStatus;
}

function readEvidenceType(value: unknown): EvidenceType {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AnalyzeReplyParseError('unknown_evidence_type');
  }
  const evidenceType = value.trim();
  if (!Object.values(EvidenceType).includes(evidenceType as EvidenceType)) {
    throw new AnalyzeReplyParseError('unknown_evidence_type');
  }
  return evidenceType as EvidenceType;
}

function readOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new AnalyzeReplyParseError('invalid_evidence_proposal');
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function parseEvidenceProposals(value: unknown): EvidenceProposalDraft[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new AnalyzeReplyParseError('invalid_evidence_proposal');
    }
    const record = item as Record<string, unknown>;
    return {
      evidenceType: readEvidenceType(record.evidence_type),
      sourceRef: readOptionalString(record.source_ref),
      content: readOptionalString(record.content),
    };
  });
}

function parseRequirementUpdate(value: unknown): RequirementUpdateDraft {
  if (!value || typeof value !== 'object') {
    throw new AnalyzeReplyParseError('invalid_requirement_update');
  }
  const record = value as Record<string, unknown>;
  return {
    requirementId: readString(record.requirement_id, 'missing_requirement_id'),
    proposedStatus: readRequirementStatus(record.proposed_status),
    evidenceProposals: parseEvidenceProposals(record.evidence_proposals),
    confidence: readConfidence(record.confidence),
    analysisReason: readString(
      record.analysis_reason,
      'missing_analysis_reason',
    ),
  };
}

function readProposedNextAction(value: unknown): ProposedNextAction {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AnalyzeReplyParseError('invalid_proposed_next_action');
  }
  const action = value.trim();
  if (
    action === 'COMPLETE' ||
    action === 'FOLLOWUP' ||
    action === 'MANUAL_REVIEW'
  ) {
    return action;
  }
  throw new AnalyzeReplyParseError('invalid_proposed_next_action');
}

export function parseAnalyzeReplyOutput(
  output: LangflowOutput,
): ReplyAnalysisResult {
  const raw = output.raw;

  if (raw.unsafe === true) {
    return {
      requirementUpdates: [],
      unsafe: true,
      proposedNextAction: 'MANUAL_REVIEW',
    };
  }

  const updatesRaw = raw.requirement_updates;
  if (!Array.isArray(updatesRaw)) {
    throw new AnalyzeReplyParseError('missing_requirement_updates');
  }

  return {
    requirementUpdates: updatesRaw.map(parseRequirementUpdate),
    unsafe: false,
    proposedNextAction: readProposedNextAction(raw.proposed_next_action),
  };
}
