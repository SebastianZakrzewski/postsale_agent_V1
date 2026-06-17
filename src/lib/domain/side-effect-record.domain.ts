import { SideEffectRecordStatus, SideEffectType } from '../enums';

export interface SideEffectRecord {
  id: string;
  workflowId: string;
  sideEffectType: SideEffectType;
  idempotencyKey: string;
  status: SideEffectRecordStatus;
  retryAllowed: boolean;
  errorCode: string | null;
  providerResponse: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}
