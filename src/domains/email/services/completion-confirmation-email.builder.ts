export interface CompletionConfirmationEmailDraft {
  subject: string;
  bodyText: string;
  bodyHtml: string;
}

export function buildCompletionConfirmationEmail(): CompletionConfirmationEmailDraft {
  const bodyText = [
    'Szanowny Kliencie,',
    '',
    'Dziękujemy za odpowiedź. Potwierdzamy, że otrzymaliśmy wszystkie wymagane informacje w prawidłowej formie.',
    '',
    'Państwa dywaniki zostaną przekazane do produkcji.',
    '',
    'Z poważaniem,',
    'Zespół EVAPREMIUM',
  ].join('\n');

  const bodyHtml = [
    '<p>Szanowny Kliencie,</p>',
    '<p>Dziękujemy za odpowiedź. Potwierdzamy, że otrzymaliśmy wszystkie wymagane informacje w prawidłowej formie.</p>',
    '<p>Państwa dywaniki zostaną przekazane do produkcji.</p>',
    '<p>Z poważaniem,<br>Zespół EVAPREMIUM</p>',
  ].join('');

  return {
    subject: 'EVAPREMIUM – potwierdzenie informacji',
    bodyText,
    bodyHtml,
  };
}
