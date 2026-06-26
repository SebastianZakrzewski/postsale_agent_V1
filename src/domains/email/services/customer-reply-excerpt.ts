import { MessageDirection, WorkflowStatus } from '../../../lib/enums';
import { CustomerMessageRow } from '../../../lib/persistence';

export const CUSTOMER_REPLY_EXCERPT_MAX_LENGTH = 500;

export function shouldIncludeCustomerReplyExcerpt(
  workflowStatus: WorkflowStatus,
): boolean {
  return workflowStatus === WorkflowStatus.REQUIREMENTS_UPDATED;
}

export function buildLastCustomerReplyExcerpt(
  messages: CustomerMessageRow[],
): string | undefined {
  const inbound = messages.filter(
    (row) => row.direction === MessageDirection.INBOUND,
  );
  if (inbound.length === 0) {
    return undefined;
  }

  const latest = [...inbound].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];

  const body = latest.body?.trim();
  if (!body) {
    return undefined;
  }

  if (body.length <= CUSTOMER_REPLY_EXCERPT_MAX_LENGTH) {
    return body;
  }

  return `${body.slice(0, CUSTOMER_REPLY_EXCERPT_MAX_LENGTH - 3)}...`;
}
