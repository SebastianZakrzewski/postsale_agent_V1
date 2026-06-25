import { parseN8nInboundEmailDto } from '../../domains/email/parsers/inbound-email.parser';
import { mapInboundEmailDtoToCommand } from '../../domains/email/parsers/inbound-email.mapper';

describe('inbound-email.parser', () => {
  it('parses canonical n8n inbound payload', () => {
    const dto = parseN8nInboundEmailDto({
      messageId: 'gmail-msg-1',
      threadId: 'thread-1',
      inReplyTo: 'provider-msg-1',
      from: { email: 'customer@example.com', name: 'Customer' },
      to: [{ email: 'sales@evapremium.com' }],
      subject: 'Re: Requirements',
      bodyText: 'Yes, confirmed.',
      receivedAt: '2026-06-25T10:00:00.000Z',
      attachments: [
        {
          filename: 'photo.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1200,
          contentRef: 'ref-1',
        },
      ],
    });

    const command = mapInboundEmailDtoToCommand(dto);
    expect(command.messageId).toBe('gmail-msg-1');
    expect(command.inReplyTo).toBe('provider-msg-1');
    expect(command.attachments).toHaveLength(1);
  });
});
