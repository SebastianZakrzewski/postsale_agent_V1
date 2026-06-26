const DEFAULT_BITRIX_PORTAL_BASE_URL = 'https://evapremium.bitrix24.pl';

export function resolveBitrixPortalBaseUrl(): string {
  const explicit = process.env.BITRIX_PORTAL_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const webhookUrl = process.env.BITRIX_WEBHOOK_URL?.trim();
  if (webhookUrl) {
    try {
      return new URL(webhookUrl).origin;
    } catch {
      // fall through to default
    }
  }

  return DEFAULT_BITRIX_PORTAL_BASE_URL;
}

export function buildBitrixDealDetailsUrl(bitrixDealId: string): string {
  return `${resolveBitrixPortalBaseUrl()}/crm/deal/details/${bitrixDealId}/`;
}
