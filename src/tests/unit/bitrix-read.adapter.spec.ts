import {
  DEFAULT_BITRIX_READ_RETRY,
  isRetryableHttpStatus,
} from '../../integrations/bitrix/bitrix-read.retry';
import { BitrixReadError } from '../../integrations/bitrix/bitrix-read.error';
import { BitrixReadAdapter } from '../../integrations/bitrix/bitrix-read.adapter';

describe('BitrixReadAdapter', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('retries retryable HTTP failures before succeeding', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          result: {
            ID: 'deal-1',
            STAGE_ID: 'NEW',
            UF_CRM_BRAND: 'BMW',
          },
        }),
      });
    global.fetch = fetchMock as typeof fetch;

    const adapter = new BitrixReadAdapter(
      'https://bitrix.example/rest/1/token',
    );
    const payload = await adapter.readDeal('deal-1');

    expect(payload.id).toBe('deal-1');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws BitrixReadError without retrying non-retryable HTTP failures', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as typeof fetch;

    const adapter = new BitrixReadAdapter(
      'https://bitrix.example/rest/1/token',
    );

    await expect(adapter.readDeal('deal-404')).rejects.toMatchObject({
      name: 'BitrixReadError',
      retryable: false,
    });
  });

  it('throws retryable BitrixReadError when request times out', async () => {
    global.fetch = jest.fn((_url, init) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const error = new Error('The operation was aborted');
          error.name = 'TimeoutError';
          reject(error);
        });
      });
    }) as typeof fetch;

    const adapter = new BitrixReadAdapter(
      'https://bitrix.example/rest/1/token',
      { maxAttempts: 1, delayMs: 0, timeoutMs: 50 },
    );

    await expect(adapter.readDeal('deal-timeout')).rejects.toMatchObject({
      name: 'BitrixReadError',
      retryable: true,
      message: expect.stringContaining('timed out after 50ms'),
    });
  });

  it('passes AbortSignal timeout to fetch', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        result: {
          ID: 'deal-1',
          STAGE_ID: 'NEW',
        },
      }),
    }) as typeof fetch;

    const adapter = new BitrixReadAdapter(
      'https://bitrix.example/rest/1/token',
      { maxAttempts: 1, delayMs: 0, timeoutMs: 5_000 },
    );

    await adapter.readDeal('deal-1');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('crm.deal.get'),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('reads primary email from crm.contact.get', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        result: {
          ID: '42',
          EMAIL: [{ VALUE_TYPE: 'WORK', VALUE: 'client@example.com' }],
        },
      }),
    }) as typeof fetch;

    const adapter = new BitrixReadAdapter(
      'https://bitrix.example/rest/1/token',
    );

    const email = await adapter.readContactPrimaryEmail('42');

    expect(email).toBe('client@example.com');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('crm.contact.get?id=42'),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });
});

describe('bitrix read retry helpers', () => {
  it('marks 5xx and 429 as retryable', () => {
    expect(isRetryableHttpStatus(503)).toBe(true);
    expect(isRetryableHttpStatus(429)).toBe(true);
    expect(isRetryableHttpStatus(404)).toBe(false);
  });

  it('uses bounded retry defaults', () => {
    expect(DEFAULT_BITRIX_READ_RETRY.maxAttempts).toBeGreaterThan(1);
    expect(DEFAULT_BITRIX_READ_RETRY.timeoutMs).toBeGreaterThan(0);
  });
});

describe('BitrixReadError', () => {
  it('preserves retryable flag', () => {
    const error = new BitrixReadError('deal-1', 'HTTP 503', true);
    expect(error.retryable).toBe(true);
    expect(error.name).toBe('BitrixReadError');
  });
});
