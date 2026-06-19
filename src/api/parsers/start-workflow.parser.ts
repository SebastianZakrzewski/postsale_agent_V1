import { StartWorkflowWebhookDto } from '../dto/webhook.dto';
import { StartWorkflowCommand } from '../../lib/commands';

export function parseStartWorkflowDto(
  dto: StartWorkflowWebhookDto,
): StartWorkflowCommand {
  if (!dto.bitrix_deal_id || !dto.idempotency_key) {
    throw new Error('Invalid start workflow payload');
  }
  return {
    bitrixDealId: dto.bitrix_deal_id,
    idempotencyKey: dto.idempotency_key,
    requestId: dto.request_id,
  };
}
