import { SideEffectType, SideEffectRecordStatus } from '../../../lib/enums';
import { SideEffectRecordRow } from '../../../lib/persistence';

export interface CreateSideEffectRecordInput {
  workflowId: string;
  sideEffectType: SideEffectType;
  idempotencyKey: string;
}

export abstract class SideEffectRecordRepository {
  abstract createPending(
    input: CreateSideEffectRecordInput,
  ): Promise<SideEffectRecordRow>;
  abstract findByIdempotencyKey(
    key: string,
  ): Promise<SideEffectRecordRow | null>;
  abstract updateStatus(
    id: string,
    status: SideEffectRecordStatus,
    errorCode?: string,
    retryAllowed?: boolean,
    providerResponse?: Record<string, unknown>,
  ): Promise<void>;
}

export const SIDE_EFFECT_RECORD_REPOSITORY = Symbol(
  'SIDE_EFFECT_RECORD_REPOSITORY',
);
