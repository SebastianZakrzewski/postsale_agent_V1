import {
  buildLastCustomerReplyExcerpt,
  shouldIncludeCustomerReplyExcerpt,
} from '../../domains/email/services/customer-reply-excerpt';
import { MessageDirection, WorkflowStatus } from '../../lib/enums';
import { CustomerMessageRow } from '../../lib/persistence';

function buildMessage(
  overrides: Partial<CustomerMessageRow> = {},
): CustomerMessageRow {
  return {
    id: 'msg-1',
    workflow_id: 'wf-1',
    direction: MessageDirection.INBOUND,
    subject: 'Re: test',
    body: 'reply body',
    from_address: 'customer@example.com',
    to_address: 'sales@evapremium.com',
    external_message_id: 'ext-1',
    created_at: '2026-06-26T10:00:00.000Z',
    updated_at: '2026-06-26T10:00:00.000Z',
    ...overrides,
  };
}

describe('customer-reply-excerpt', () => {
  it('includes excerpt only after requirements were updated from a reply', () => {
    expect(
      shouldIncludeCustomerReplyExcerpt(WorkflowStatus.REQUIREMENTS_UPDATED),
    ).toBe(true);
    expect(
      shouldIncludeCustomerReplyExcerpt(
        WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY,
      ),
    ).toBe(false);
  });

  it('returns latest inbound body as excerpt', () => {
    const excerpt = buildLastCustomerReplyExcerpt([
      buildMessage({
        id: 'msg-1',
        body: 'older reply',
        created_at: '2026-06-26T09:00:00.000Z',
      }),
      buildMessage({
        id: 'msg-2',
        body: 'latest reply',
        created_at: '2026-06-26T10:00:00.000Z',
      }),
    ]);

    expect(excerpt).toBe('latest reply');
  });

  it('ignores outbound messages', () => {
    const excerpt = buildLastCustomerReplyExcerpt([
      buildMessage({
        direction: MessageDirection.OUTBOUND,
        body: 'outbound body',
        created_at: '2026-06-26T11:00:00.000Z',
      }),
    ]);

    expect(excerpt).toBeUndefined();
  });

  it('truncates long replies', () => {
    const excerpt = buildLastCustomerReplyExcerpt([
      buildMessage({ body: 'x'.repeat(600) }),
    ]);

    expect(excerpt).toHaveLength(500);
    expect(excerpt?.endsWith('...')).toBe(true);
  });
});
