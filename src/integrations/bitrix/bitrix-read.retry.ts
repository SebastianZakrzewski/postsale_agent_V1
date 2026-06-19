export interface BitrixReadRetryOptions {
  maxAttempts: number;
  delayMs: number;
  timeoutMs: number;
}

export const DEFAULT_BITRIX_READ_RETRY: BitrixReadRetryOptions = {
  maxAttempts: 3,
  delayMs: 100,
  timeoutMs: 10_000,
};

export function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
