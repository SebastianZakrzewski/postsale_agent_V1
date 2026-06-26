import { HttpLangflowAdapter } from '../../integrations/langflow/langflow.adapter';
import { LANGFLOW_FLOW_CLASSIFY_TEMPLATE_NOTES } from '../../domains/langflow/config/langflow-flow-names';

describe('HttpLangflowAdapter', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('invokes Langflow run API and maps response to LangflowOutput', async () => {
    process.env.LANGFLOW_FLOW_CLASSIFY_TEMPLATE_NOTES =
      'flow-uuid-classify-123';

    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          outputs: [
            {
              outputs: [
                {
                  results: {
                    message: {
                      text: '{"classifications":[],"unsafe_notes":[]}',
                    },
                  },
                },
              ],
            },
          ],
        }),
    });

    const adapter = new HttpLangflowAdapter({
      baseUrl: 'http://localhost:7860',
      apiKey: 'test-key',
      fetchImpl,
    });

    const result = await adapter.invoke(LANGFLOW_FLOW_CLASSIFY_TEMPLATE_NOTES, {
      workflowId: 'wf-1',
      notes: [],
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:7860/api/v1/run/flow-uuid-classify-123',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'test-key',
        }),
      }),
    );

    expect(result).toEqual({
      flowName: LANGFLOW_FLOW_CLASSIFY_TEMPLATE_NOTES,
      raw: { classifications: [], unsafe_notes: [] },
    });
  });
});
