import { N8nEmailAdapter } from '../../integrations/email/n8n-email.adapter';

describe('N8nEmailAdapter', () => {
  it('sends HTML body when bodyHtml is provided', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => '{"id":"msg-1"}',
    });
    const adapter = new N8nEmailAdapter(
      'https://n8n.example/webhook/send_email',
      fetchMock as unknown as typeof fetch,
    );

    await adapter.send({
      to: 'customer@example.com',
      subject: 'Test',
      body: 'Plain\n\nLine 2',
      bodyHtml: '<p>Plain</p><p>Line 2</p>',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body)) as Record<string, string>;
    expect(payload.body).toBe('<p>Plain</p><p>Line 2</p>');
    expect(payload.body_text).toBe('Plain\n\nLine 2');
    expect(payload.body_html).toBe('<p>Plain</p><p>Line 2</p>');
  });

  it('falls back to plain body when bodyHtml is missing', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => '{}',
    });
    const adapter = new N8nEmailAdapter(
      'https://n8n.example/webhook/send_email',
      fetchMock as unknown as typeof fetch,
    );

    await adapter.send({
      to: 'customer@example.com',
      subject: 'Test',
      body: 'Plain only',
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body)) as Record<string, string>;
    expect(payload.body).toBe('Plain only');
    expect(payload.body_text).toBe('Plain only');
    expect(payload.body_html).toBeUndefined();
  });
});
