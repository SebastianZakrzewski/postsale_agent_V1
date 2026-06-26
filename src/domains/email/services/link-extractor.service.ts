const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/gi;

export function extractUrlsFromEmailBody(bodyText: string): string[] {
  const matches = bodyText.match(URL_PATTERN) ?? [];
  const unique = new Set<string>();
  for (const match of matches) {
    const cleaned = match.replace(/[.,;:!?)]+$/, '');
    if (cleaned.length > 0) {
      unique.add(cleaned);
    }
  }
  return [...unique];
}
