export interface SendEmailInput {
  to: string;
  subject: string;
  /** Plain-text body (audit + fallback). */
  body: string;
  /** HTML body for providers that render multipart/HTML (e.g. n8n Gmail). */
  bodyHtml?: string | null;
}

export interface SendEmailResult {
  providerMessageId: string;
}

export abstract class EmailProvider {
  abstract send(input: SendEmailInput): Promise<SendEmailResult>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
