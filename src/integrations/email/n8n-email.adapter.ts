import { randomUUID } from 'crypto';
import {
  EmailProvider,
  SendEmailInput,
  SendEmailResult,
} from './email.provider';

export class N8nEmailSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'N8nEmailSendError';
  }
}

export class N8nEmailAdapter extends EmailProvider {
  constructor(
    private readonly webhookUrl: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    super();
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    let response: Response;
    try {
      response = await this.fetchImpl(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: input.to,
          subject: input.subject,
          body: input.bodyHtml?.trim() || input.body,
          body_text: input.body,
          ...(input.bodyHtml?.trim()
            ? { body_html: input.bodyHtml.trim() }
            : {}),
        }),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'n8n email request failed';
      throw new N8nEmailSendError(message);
    }

    const responseText = await response.text();
    if (!response.ok) {
      throw new N8nEmailSendError(
        `n8n email HTTP ${response.status}: ${responseText.slice(0, 500)}`,
      );
    }

    let providerMessageId = `n8n-${randomUUID()}`;
    try {
      const body = JSON.parse(responseText) as Record<string, unknown>;
      const candidate =
        body.providerMessageId ??
        body.provider_message_id ??
        body.messageId ??
        body.message_id ??
        body.id;
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        providerMessageId = candidate.trim();
      }
    } catch {
      // n8n may return non-JSON; synthetic id is enough for side_effect audit
    }

    return { providerMessageId };
  }
}
