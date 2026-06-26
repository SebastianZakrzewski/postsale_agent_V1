import { buildCompletionConfirmationEmail } from '../../domains/email/services/completion-confirmation-email.builder';

describe('buildCompletionConfirmationEmail', () => {
  it('confirms valid reply and production handoff', () => {
    const draft = buildCompletionConfirmationEmail();

    expect(draft.subject).toContain('potwierdzenie');
    expect(draft.bodyText).toContain('prawidłowej formie');
    expect(draft.bodyText).toContain('przekazane do produkcji');
    expect(draft.bodyHtml).toContain('produkcji');
  });
});
