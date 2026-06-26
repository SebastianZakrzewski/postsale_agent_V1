import { TemplateMatchStatus } from '../../../lib/enums';

export function buildBitrixTemplateMatchEscalationComment(input: {
  templateMatchStatus: TemplateMatchStatus;
  reason?: string | null;
}): string {
  if (input.templateMatchStatus === TemplateMatchStatus.AMBIGUOUS) {
    return [
      'Postsale Agent: dopasowanie szablonu EVAMATS jest niejednoznaczne (AMBIGUOUS).',
      'Prosimy o ręczne wskazanie właściwego szablonu przed wysyłką pytań do klienta.',
      input.reason ? `Szczegóły: ${input.reason}` : null,
    ]
      .filter(Boolean)
      .join(' ');
  }

  return [
    'Postsale Agent: nie udało się dopasować szablonu EVAMATS.',
    input.reason ? `Powód: ${input.reason}` : null,
  ]
    .filter(Boolean)
    .join(' ');
}
