import { DealContext, Workflow } from '../../domain';
import { PostsaleWorkflowRow } from '../rows';

function parseDealContextJson(
  value: Record<string, unknown> | null,
): DealContext | null {
  if (!value) {
    return null;
  }

  const { bitrixDealId, brand, model, bodyType, generation, product } = value;

  if (
    typeof bitrixDealId !== 'string' ||
    typeof brand !== 'string' ||
    typeof model !== 'string' ||
    typeof bodyType !== 'string' ||
    typeof product !== 'string'
  ) {
    return null;
  }

  return {
    bitrixDealId,
    brand,
    model,
    bodyType,
    generation:
      generation === null || typeof generation === 'string' ? generation : null,
    product,
  };
}

export function toPostsaleWorkflow(row: PostsaleWorkflowRow): Workflow {
  return {
    id: row.id,
    bitrixDealId: row.bitrix_deal_id,
    status: row.status,
    templateMatchStatus: row.template_match_status,
    dealContext: parseDealContextJson(row.deal_context_json),
    carTemplateId: row.car_template_id,
    product: row.product,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
