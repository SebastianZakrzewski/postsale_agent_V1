import {
  RequirementLabel,
  RequirementStatus,
  EvidenceType,
} from '../../../lib/enums';
import {
  RequirementUpdateDraft,
  ReplyAnalysisResult,
} from '../../../lib/domain/reply-analysis.domain';
import { WorkflowRequirementRow } from '../../../lib/persistence';
import { sourceNoteRequiresOptionSelection } from '../../langflow/parsers/note-label-heuristics';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function extractOptionTokens(sourceNote: string): string[] {
  const normalized = normalize(sourceNote);
  const tokens = new Set<string>();

  const quoted = [...normalized.matchAll(/"([^"]+)"/g)].map((m) =>
    m[1]!.trim(),
  );
  for (const item of quoted) {
    if (item.length >= 2) {
      tokens.add(item);
    }
  }

  const patterns = [
    /\b(gorny|dolny)\b/g,
    /\b(\d+[.,]?\d*\s*cm)\b/g,
    /\b(automat\w*|manual\w*|reczny\w*|elektryczn\w*)\b/g,
    /\b(1\+1|1\+2)\b/g,
    /\b(metal\w*|wykladzin\w*)\b/g,
  ];

  for (const pattern of patterns) {
    for (const match of normalized.matchAll(pattern)) {
      const token = match[1]?.trim();
      if (token && token.length >= 2) {
        tokens.add(token);
      }
    }
  }

  if (/\boraz\b/.test(normalized)) {
    const parts = normalized.split(/\boraz\b/);
    for (const part of parts) {
      const cm = part.match(/\d+[.,]?\d*\s*cm/);
      if (cm) {
        tokens.add(cm[0].trim());
      }
    }
  }

  return [...tokens];
}

function replyContainsOptionToken(body: string, token: string): boolean {
  const normalizedBody = normalize(body);
  const normalizedToken = normalize(token);
  if (normalizedToken.length < 2) {
    return false;
  }
  return normalizedBody.includes(normalizedToken);
}

export function applyOptionSelectionReplyHeuristic(input: {
  analysis: ReplyAnalysisResult;
  requirements: WorkflowRequirementRow[];
  messageBody: string;
}): ReplyAnalysisResult {
  const updates = input.analysis.requirementUpdates.map((update) =>
    maybePromoteOptionSelectionUpdate(
      update,
      input.requirements,
      input.messageBody,
    ),
  );

  return {
    ...input.analysis,
    requirementUpdates: updates,
  };
}

function maybePromoteOptionSelectionUpdate(
  update: RequirementUpdateDraft,
  requirements: WorkflowRequirementRow[],
  messageBody: string,
): RequirementUpdateDraft {
  if (update.proposedStatus !== RequirementStatus.PARTIAL) {
    return update;
  }

  const requirement = requirements.find(
    (row) => row.id === update.requirementId,
  );
  if (!requirement || requirement.label !== RequirementLabel.OPTION_SELECTION) {
    return update;
  }

  const sourceNote = requirement.source_note ?? '';
  if (!sourceNoteRequiresOptionSelection(sourceNote)) {
    return update;
  }

  const tokens = extractOptionTokens(sourceNote);
  const matchedToken = tokens.find((token) =>
    replyContainsOptionToken(messageBody, token),
  );
  if (!matchedToken) {
    return update;
  }

  const fragment =
    update.evidenceProposals.find((p) => p.content)?.content ?? matchedToken;

  return {
    ...update,
    proposedStatus: RequirementStatus.VALID,
    evidenceProposals:
      update.evidenceProposals.length > 0
        ? update.evidenceProposals
        : [
            {
              evidenceType: EvidenceType.TEXT_FRAGMENT,
              sourceRef: null,
              content: fragment,
            },
          ],
    confidence: Math.max(update.confidence, 0.88),
    analysisReason: `${update.analysisReason} Promoted by OPTION_SELECTION heuristic (explicit option "${matchedToken}").`,
  };
}
