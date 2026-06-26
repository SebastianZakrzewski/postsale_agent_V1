import { EvidenceType } from '../../lib/enums';
import {
  buildTelegramCompletionNotification,
  buildTelegramEscalationNotification,
} from '../../domains/telegram/services/telegram-workflow-notification.builder';
import { RequirementEvidenceRow } from '../../lib/persistence';

const DEAL_URL = 'https://evapremium.bitrix24.pl/crm/deal/details/35916/';

function evidenceRow(evidenceType: EvidenceType): RequirementEvidenceRow {
  return {
    id: 'ev-1',
    requirement_id: 'req-1',
    workflow_id: 'wf-1',
    evidence_type: evidenceType,
    source_ref: null,
    content: 'sample',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe('telegram-workflow-notification.builder', () => {
  beforeEach(() => {
    process.env.BITRIX_WEBHOOK_URL =
      'https://evapremium.bitrix24.pl/rest/24/token/';
  });

  it('uses text-only completion message with deal URL', () => {
    expect(
      buildTelegramCompletionNotification(
        [evidenceRow(EvidenceType.TEXT_FRAGMENT)],
        '35916',
      ),
    ).toBe(
      `Klient poprawnie odpowiedział na informacje dotyczące uwag szablonów.\n${DEAL_URL}`,
    );
  });

  it('uses text and photos message with deal URL', () => {
    expect(
      buildTelegramCompletionNotification(
        [
          evidenceRow(EvidenceType.TEXT_FRAGMENT),
          evidenceRow(EvidenceType.EMAIL_ATTACHMENT),
        ],
        '35916',
      ),
    ).toBe(
      `Klient poprawnie wysłał informacje dotyczące uwag szablonów oraz załączył zdjęcia do ręcznej weryfikacji.\n${DEAL_URL}`,
    );
  });

  it('uses photos-only message with deal URL', () => {
    expect(
      buildTelegramCompletionNotification(
        [evidenceRow(EvidenceType.EMAIL_ATTACHMENT)],
        '35916',
      ),
    ).toBe(
      `Klient poprawnie wysłał zdjęcia, do ręcznej weryfikacji.\n${DEAL_URL}`,
    );
  });

  it('uses escalation message with deal URL', () => {
    expect(buildTelegramEscalationNotification('35916')).toBe(
      `Nie udało się poprawnie zweryfikować odpowiedzi przez Klienta, do ręcznej weryfikacji.\n${DEAL_URL}`,
    );
  });
});
