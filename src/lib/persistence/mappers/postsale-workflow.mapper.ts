import { Workflow } from '../../domain';
import { PostsaleWorkflowRow } from '../rows';

export function toPostsaleWorkflow(row: PostsaleWorkflowRow): Workflow {
  return {
    id: row.id,
    bitrixDealId: row.bitrix_deal_id,
    status: row.status,
    templateMatchStatus: row.template_match_status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
