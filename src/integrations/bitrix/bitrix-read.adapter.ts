import { BitrixDealPayload } from './bitrix.types';
import { BitrixReadError } from './bitrix-read.error';
import {
  BitrixReadRetryOptions,
  DEFAULT_BITRIX_READ_RETRY,
  isRetryableHttpStatus,
  sleep,
} from './bitrix-read.retry';
import { BitrixProvider } from './bitrix.provider';

interface BitrixDealGetResponse {
  result?: Record<string, unknown>;
}

export class BitrixReadAdapter extends BitrixProvider {
  constructor(
    private readonly webhookUrl: string,
    private readonly retryOptions: BitrixReadRetryOptions = DEFAULT_BITRIX_READ_RETRY,
  ) {
    super();
  }

  async readDeal(dealId: string): Promise<BitrixDealPayload> {
    let lastError: BitrixReadError | null = null;

    for (
      let attempt = 1;
      attempt <= this.retryOptions.maxAttempts;
      attempt += 1
    ) {
      try {
        return await this.readDealOnce(dealId);
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
      new BitrixReadError(dealId, 'Unknown Bitrix read failure', false)
    );
  }

  private async readDealOnce(dealId: string): Promise<BitrixDealPayload> {
    const url = `${this.webhookUrl.replace(/\/$/, '')}/crm.deal.get?id=${encodeURIComponent(dealId)}`;

    let response: Response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(this.retryOptions.timeoutMs),
      });
    } catch (error) {
      if (isFetchTimeoutError(error)) {
        throw new BitrixReadError(
          dealId,
          `Request timed out after ${this.retryOptions.timeoutMs}ms`,
          true,
        );
      }

      throw new BitrixReadError(
        dealId,
        error instanceof Error ? error.message : 'Network error',
        true,
      );
    }

    if (!response.ok) {
      throw new BitrixReadError(
        dealId,
        `HTTP ${response.status}`,
        isRetryableHttpStatus(response.status),
      );
    }

    const body = (await response.json()) as BitrixDealGetResponse;
    const result = body.result;

    if (!result) {
      throw new BitrixReadError(dealId, 'Empty result payload', false);
    }

    const id = String(result.ID ?? dealId);
    const stageId =
      typeof result.STAGE_ID === 'string' ? result.STAGE_ID : undefined;

    const fields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(result)) {
      if (key !== 'ID' && key !== 'STAGE_ID') {
        fields[key] = value;
      }
    }

    return { id, stageId, fields };
  }
}

function isFetchTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === 'TimeoutError' || error.name === 'AbortError';
}
