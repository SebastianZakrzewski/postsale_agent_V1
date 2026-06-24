import {
  EVAMATS_BODY_TYPE_SLUGS,
  POLISH_TO_ENGLISH_TOKENS,
} from './evamats-slug-mappings';

const POLISH_DIACRITICS: Readonly<Record<string, string>> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
};

export function normalizeField(value: string | null | undefined): string {
  if (value == null) {
    return '';
  }
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normalizeIdentifier(value: string | null | undefined): string {
  if (value == null) {
    return '';
  }

  const prepared = stripDiacritics(value.trim().toLowerCase());
  const translated = translatePolishTokens(prepared);
  return toSlug(translated, { allowHyphens: true });
}

export function normalizeBodyType(value: string | null | undefined): string {
  if (value == null) {
    return '';
  }

  const spacedKey = normalizeField(value);
  const mapped = EVAMATS_BODY_TYPE_SLUGS[spacedKey];
  if (mapped) {
    return mapped;
  }

  const asciiKey = stripDiacritics(spacedKey);
  const mappedAscii = EVAMATS_BODY_TYPE_SLUGS[asciiKey];
  if (mappedAscii) {
    return mappedAscii;
  }

  return normalizeIdentifier(value);
}

export function normalizeGeneration(
  value: string | null | undefined,
): string | null {
  const normalized = normalizeIdentifier(value);
  return normalized.length > 0 ? normalized : null;
}

export function normalizeOptionalBodyType(
  value: string | null | undefined,
): string | null {
  const normalized = normalizeBodyType(value);
  return normalized.length > 0 ? normalized : null;
}

export function normalizeVehicleFields(input: {
  brand: string;
  model: string;
  bodyType: string;
  generation?: string | null;
}): {
  brand: string;
  model: string;
  bodyType: string;
  generation: string | null;
} {
  return {
    brand: normalizeIdentifier(input.brand),
    model: normalizeIdentifier(input.model),
    bodyType: normalizeBodyType(input.bodyType),
    generation: normalizeGeneration(input.generation),
  };
}

function stripDiacritics(value: string): string {
  return value.replace(
    /[ąćęłńóśźż]/g,
    (char) => POLISH_DIACRITICS[char] ?? char,
  );
}

function translatePolishTokens(value: string): string {
  let result = value;
  for (const [polish, english] of POLISH_TO_ENGLISH_TOKENS) {
    result = result.replace(new RegExp(polish, 'g'), english);
  }
  return result;
}

function toSlug(value: string, options: { allowHyphens: boolean }): string {
  const allowedPattern = options.allowHyphens
    ? /[^a-z0-9_-]+/g
    : /[^a-z0-9_]+/g;
  return value
    .replace(/[()]/g, '_')
    .replace(allowedPattern, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}
