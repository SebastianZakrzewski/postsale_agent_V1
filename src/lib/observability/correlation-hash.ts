import { createHash } from 'crypto';

export function hashForLogCorrelation(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}
