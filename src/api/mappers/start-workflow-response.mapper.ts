import { StartWorkflowResult } from '../../lib/domain';

export interface StartWorkflowWebhookResponse {
  workflow_id: string;
  status: string;
  template_match_status: string | null;
  is_duplicate: boolean;
}

export function mapStartWorkflowResultToWebhookResponse(
  result: StartWorkflowResult,
): StartWorkflowWebhookResponse {
  return {
    workflow_id: result.workflowId,
    status: result.status,
    template_match_status: result.templateMatchStatus,
    is_duplicate: result.isDuplicate,
  };
}
