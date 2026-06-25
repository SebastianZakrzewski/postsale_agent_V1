import { EvidenceType, RequirementStatus } from '../enums';

export type ProposedNextAction = 'COMPLETE' | 'FOLLOWUP' | 'MANUAL_REVIEW';

export interface EvidenceProposalDraft {
  evidenceType: EvidenceType;
  sourceRef: string | null;
  content: string | null;
}

export interface RequirementUpdateDraft {
  requirementId: string;
  proposedStatus: RequirementStatus;
  evidenceProposals: EvidenceProposalDraft[];
  confidence: number;
  analysisReason: string;
}

export interface ReplyAnalysisResult {
  requirementUpdates: RequirementUpdateDraft[];
  unsafe: boolean;
  proposedNextAction: ProposedNextAction;
}
