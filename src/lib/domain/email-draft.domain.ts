export interface EmailDraft {
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  proposedRequirementRefs: string[];
  confidence: number;
}
