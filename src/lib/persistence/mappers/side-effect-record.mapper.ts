import { SideEffectRecord } from '../../domain';
import { SideEffectRecordRow } from '../rows';

export function toSideEffectRecord(row: SideEffectRecordRow): SideEffectRecord {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    sideEffectType: row.side_effect_type,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    retryAllowed: row.retry_allowed,
    errorCode: row.error_code,
    providerResponse: row.provider_response,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
