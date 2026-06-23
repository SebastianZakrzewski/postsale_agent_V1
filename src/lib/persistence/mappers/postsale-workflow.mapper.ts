import { DealContext, Workflow } from '../../domain';
import { PostsaleWorkflowRow } from '../rows';

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

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

  const productSource = readOptionalString(value.productSource);
  const parsedProductSource =
    productSource === 'string' || productSource === 'enum_fallback'
      ? productSource
      : undefined;

  return {
    bitrixDealId,
    brand,
    model,
    bodyType,
    generation:
      generation === null || typeof generation === 'string' ? generation : null,
    product,
    productSource: parsedProductSource,
    setVariantId:
      value.setVariantId === null || typeof value.setVariantId === 'string'
        ? value.setVariantId
        : undefined,
    setVariantLabel: readOptionalString(value.setVariantLabel),
  };
}

export function toPostsaleWorkflow(row: PostsaleWorkflowRow): Workflow {
  return {
    id: row.id,
    bitrixDealId: row.bitrix_deal_id,
    status: row.status,
    templateMatchStatus: row.template_match_status,
    dealContext: parseDealContextJson(row.deal_context_json),
    product: row.product,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
