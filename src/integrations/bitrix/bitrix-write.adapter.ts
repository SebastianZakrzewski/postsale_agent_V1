import { BitrixReadAdapter } from './bitrix-read.adapter';
import { BitrixReadError } from './bitrix-read.error';
import {
  BitrixReadRetryOptions,
  DEFAULT_BITRIX_READ_RETRY,
  isRetryableHttpStatus,
  sleep,
} from './bitrix-read.retry';

interface BitrixMutationResponse {
  result?: unknown;
  error?: string;
  error_description?: string;
}

export class BitrixWriteAdapter extends BitrixReadAdapter {
  constructor(
    webhookUrl: string,
    retryOptions: BitrixReadRetryOptions = DEFAULT_BITRIX_READ_RETRY,
  ) {
    super(webhookUrl, retryOptions);
  }

  async updateDealStage(dealId: string, stageId: string): Promise<void> {
    await this.postWithRetry('crm.deal.update', dealId, {
      id: dealId,
      fields: { STAGE_ID: stageId },
    });
  }

  async addDealComment(dealId: string, comment: string): Promise<void> {
    await this.postWithRetry('crm.timeline.comment.add', dealId, {
      fields: {
        ENTITY_ID: dealId,
        ENTITY_TYPE: 'deal',
        COMMENT: comment,
      },
    });
  }

  private async postWithRetry(
    method: string,
    entityId: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    let lastError: BitrixReadError | null = null;

    for (
      let attempt = 1;
      attempt <= this.retryOptions.maxAttempts;
      attempt += 1
    ) {
      try {
        await this.postOnce(method, entityId, body);
        return;
      } catch (error) {
        if (!(error instanceof BitrixReadError)) {
          throw error;
        }

        lastError = error;
        const hasRetryLeft = attempt < this.retryOptions.maxAttempts;
        if (!error.retryable || !hasRetryLeft) {
          throw error;
        }

        await sleep(this.retryOptions.delayMs * attempt);
      }
    }

    throw (
      lastError ??
      new BitrixReadError(entityId, 'Unknown Bitrix write failure', false)
    );
  }

  private async postOnce(
    method: string,
    entityId: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    const url = `${this.webhookUrl.replace(/\/$/, '')}/${method}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.retryOptions.timeoutMs),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error';
      throw new BitrixReadError(entityId, message, true);
    }

    if (!response.ok) {
      throw new BitrixReadError(
        entityId,
        `HTTP ${response.status}`,
        isRetryableHttpStatus(response.status),
      );
    }

    const payload = (await response.json()) as BitrixMutationResponse;
    if (payload.error) {
      throw new BitrixReadError(
        entityId,
        payload.error_description ?? payload.error,
        false,
      );
    }
  }
}
