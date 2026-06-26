import { RequirementLabel } from '../../../lib/enums';

export type ExpectedNoteOutcome =
  | { kind: 'classify'; label: RequirementLabel }
  | { kind: 'unsafe' };

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const UNSAFE_PATTERNS = [
  /\bnie mamy szablonu\b/,
  /\bbrak szablonu\b/,
  /\btylko dla operator/,
  /\bignore (all )?previous instructions\b/,
];

const PHOTO_PATTERNS = [
  /\bzdjec/i,
  /\bfoto\b/,
  /\bphoto\b/,
  /\bzalacz/i,
  /\bprzesl(a|anie|ij).*zdj/i,
  /\bobraz\b/,
  /\bvisual proof\b/,
];

const MEASUREMENT_PATTERNS = [
  /\bwymiar/,
  /\bzmierz/,
  /\b\d+[.,]?\d*\s*cm\b/,
  /\b\d+[.,]?\d*\s*mm\b/,
  /\bdlugosc\b/,
  /\bszerokosc\b/,
  /\bwysokosc\b/,
  /\bpo dlugosci\b/,
];

const OPTION_PATTERNS = [
  /\b(gorny|dolny)\s+czy\s+(gorny|dolny)\b/,
  /\b(automat\w*|manual\w*)\s+czy\s+(automat\w*|manual\w*)\b/,
  /\b(jednolit\w*|jednolite)\s+(lub|albo|czy)\s+.*\b(2\s+czesci|dwie\s+czesci)\b/,
  /\b(jaki|ktory)\s+.+\b(czy|lub|albo)\b/,
  /\b(zaznaczenie|wybor|wybierz|wybieramy)\b/,
  /\b\d+\s*(szablon|rodzaj|wariant|opc)/,
  /\bwybierz\b/,
  /\bwybor\b/,
  /\boraz\b.*\b(cm|mm|szablon|rodzaj|wariant)\b/,
  /\b(lub|albo)\b/,
  /\b\w+\s+czy\s+\w+\b.*\b(poziom|wariant|szablon|rodzaj)\b/,
];

const YES_NO_PATTERNS = [
  /\bczy\b/,
  /\bpotwierdz\b/,
  /\bsprawdz.*czy\b/,
  /\btak\/nie\b/,
  /\byes\/no\b/,
  /\bmoze(my)? wykonac\b/,
];

export function sourceNoteRequiresOptionSelection(sourceNote: string): boolean {
  const normalized = normalize(sourceNote);
  return OPTION_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isClassificationLabelCompatibleWithSourceNote(
  sourceNote: string,
  label: RequirementLabel,
): boolean {
  if (
    sourceNoteRequiresOptionSelection(sourceNote) &&
    label === RequirementLabel.YES_NO_INFO
  ) {
    return false;
  }

  return true;
}

export function inferExpectedNoteOutcome(text: string): ExpectedNoteOutcome {
  const normalized = normalize(text);

  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(normalized)) {
      return { kind: 'unsafe' };
    }
  }

  for (const pattern of PHOTO_PATTERNS) {
    if (pattern.test(normalized)) {
      return { kind: 'classify', label: RequirementLabel.PHOTO_REQUIRED };
    }
  }

  for (const pattern of MEASUREMENT_PATTERNS) {
    if (pattern.test(normalized)) {
      return { kind: 'classify', label: RequirementLabel.MEASUREMENT };
    }
  }

  for (const pattern of OPTION_PATTERNS) {
    if (pattern.test(normalized)) {
      return { kind: 'classify', label: RequirementLabel.OPTION_SELECTION };
    }
  }

  for (const pattern of YES_NO_PATTERNS) {
    if (pattern.test(normalized)) {
      return { kind: 'classify', label: RequirementLabel.YES_NO_INFO };
    }
  }

  return { kind: 'classify', label: RequirementLabel.TEXT_CONFIRMATION };
}
