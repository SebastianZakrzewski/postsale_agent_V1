import { EvidenceType } from '../../../lib/enums';
import { RequirementEvidenceRow } from '../../../lib/persistence';
import { buildBitrixDealDetailsUrl } from '../../bitrix/config/bitrix-portal.config';

const COMPLETION_TEXT_ONLY =
  'Klient poprawnie odpowiedział na informacje dotyczące uwag szablonów.';

const COMPLETION_TEXT_AND_PHOTOS =
  'Klient poprawnie wysłał informacje dotyczące uwag szablonów oraz załączył zdjęcia do ręcznej weryfikacji.';

const COMPLETION_PHOTOS_ONLY =
  'Klient poprawnie wysłał zdjęcia, do ręcznej weryfikacji.';

const ESCALATION_TEXT =
  'Nie udało się poprawnie zweryfikować odpowiedzi przez Klienta, do ręcznej weryfikacji.';

function appendDealUrl(message: string, bitrixDealId: string): string {
  return `${message}\n${buildBitrixDealDetailsUrl(bitrixDealId)}`;
}

function hasPhotoEvidence(evidence: RequirementEvidenceRow[]): boolean {
  return evidence.some(
    (row) => row.evidence_type === EvidenceType.EMAIL_ATTACHMENT,
  );
}

function hasNonPhotoEvidence(evidence: RequirementEvidenceRow[]): boolean {
  return evidence.some(
    (row) =>
      row.evidence_type === EvidenceType.TEXT_FRAGMENT ||
      row.evidence_type === EvidenceType.EXTERNAL_LINK ||
      row.evidence_type === EvidenceType.MANUAL_APPROVAL,
  );
}

export function buildTelegramCompletionNotification(
  evidence: RequirementEvidenceRow[],
  bitrixDealId: string,
): string {
  const hasPhotos = hasPhotoEvidence(evidence);
  const hasText = hasNonPhotoEvidence(evidence);

  if (hasPhotos && !hasText) {
    return appendDealUrl(COMPLETION_PHOTOS_ONLY, bitrixDealId);
  }

  if (hasPhotos && hasText) {
    return appendDealUrl(COMPLETION_TEXT_AND_PHOTOS, bitrixDealId);
  }

  return appendDealUrl(COMPLETION_TEXT_ONLY, bitrixDealId);
}

export function buildTelegramEscalationNotification(
  bitrixDealId: string,
): string {
  return appendDealUrl(ESCALATION_TEXT, bitrixDealId);
}
