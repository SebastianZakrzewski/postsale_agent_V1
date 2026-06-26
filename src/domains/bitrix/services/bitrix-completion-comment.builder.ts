import {
  RequirementEvidenceRow,
  WorkflowRequirementRow,
} from '../../../lib/persistence';
import { isBitrixCompletionStageUpdateEnabled } from '../config/bitrix-stage.config';

export function buildBitrixCompletionComment(
  requirements: WorkflowRequirementRow[],
  evidence: RequirementEvidenceRow[],
): string {
  const header = isBitrixCompletionStageUpdateEnabled()
    ? 'Postsale Agent: wymagania zebrane, deal przeniesiony do Deale do dodania.'
    : 'Postsale Agent: wymagania zebrane.';

  if (requirements.length === 0) {
    return header;
  }

  const lines = requirements.map((requirement) => {
    const answers = evidence
      .filter((row) => row.requirement_id === requirement.id)
      .map((row) => row.content?.trim())
      .filter((value): value is string => Boolean(value));

    const question = requirement.source_note?.trim() || requirement.label;
    const answer = answers.length > 0 ? answers.join('; ') : '—';

    return `• ${question} → ${answer}`;
  });

  return `${header}\n\nZebrane odpowiedzi:\n${lines.join('\n')}`;
}
