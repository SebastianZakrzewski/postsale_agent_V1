import { parseContactPrimaryEmail } from '../../domains/bitrix/parsers/bitrix-contact-email.parser';
import { BitrixDealPayload } from './bitrix.types';
import { BitrixReadError } from './bitrix-read.error';
import {
  BitrixReadRetryOptions,
  DEFAULT_BITRIX_READ_RETRY,
  isRetryableHttpStatus,
  sleep,
} from './bitrix-read.retry';
import { BitrixProvider } from './bitrix.provider';

interface BitrixGetResponse {
  result?: Record<string, unknown>;
}

export class BitrixReadAdapter extends BitrixProvider {
  constructor(
    protected readonly webhookUrl: string,
    protected readonly retryOptions: BitrixReadRetryOptions = DEFAULT_BITRIX_READ_RETRY,
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

  async readContactPrimaryEmail(contactId: string): Promise<string | null> {
    let lastError: BitrixReadError | null = null;

    for (
      let attempt = 1;
      attempt <= this.retryOptions.maxAttempts;
      attempt += 1
    ) {
      try {
        return await this.readContactPrimaryEmailOnce(contactId);
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
      new BitrixReadError(
        contactId,
        'Unknown Bitrix contact read failure',
        false,
      )
    );
  }

  async updateDealStage(dealId: string, _stageId: string): Promise<void> {
    throw new BitrixReadError(
      dealId,
      'Bitrix write is not available on read-only adapter',
      false,
    );
  }

  async addDealComment(dealId: string, _comment: string): Promise<void> {
    throw new BitrixReadError(
      dealId,
      'Bitrix write is not available on read-only adapter',
      false,
    );
  }

  private async readContactPrimaryEmailOnce(
    contactId: string,
  ): Promise<string | null> {
    const result = await this.fetchBitrixEntity(
      'crm.contact.get',
      contactId,
      contactId,
    );

    return parseContactPrimaryEmail(result);
  }

  private async fetchBitrixEntity(
    method: string,
    entityId: string,
    errorEntityId: string,
  ): Promise<Record<string, unknown>> {
    const url = `${this.webhookUrl.replace(/\/$/, '')}/${method}?id=${encodeURIComponent(entityId)}`;

    let response: Response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(this.retryOptions.timeoutMs),
      });
    } catch (error) {
      if (isFetchTimeoutError(error)) {
        throw new BitrixReadError(
          errorEntityId,
          `Request timed out after ${this.retryOptions.timeoutMs}ms`,
          true,
        );
      }

      throw new BitrixReadError(
        errorEntityId,
        error instanceof Error ? error.message : 'Network error',
        true,
      );
    }

    if (!response.ok) {
      throw new BitrixReadError(
        errorEntityId,
        `HTTP ${response.status}`,
        isRetryableHttpStatus(response.status),
      );
    }

    const body = (await response.json()) as BitrixGetResponse;
    const result = body.result;

    if (!result) {
      throw new BitrixReadError(errorEntityId, 'Empty result payload', false);
    }

    return result;
  }

  private async readDealOnce(dealId: string): Promise<BitrixDealPayload> {
    const result = await this.fetchBitrixEntity('crm.deal.get', dealId, dealId);

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
