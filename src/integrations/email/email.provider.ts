export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  providerMessageId: string;
}

export abstract class EmailProvider {
  abstract send(input: SendEmailInput): Promise<SendEmailResult>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
