import { extractLangflowRawOutput } from '../../integrations/langflow/langflow-response.parser';

describe('extractLangflowRawOutput', () => {
  it('extracts JSON from Langflow run message text', () => {
    const body = {
      session_id: 'sess-1',
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
    };

    expect(extractLangflowRawOutput(body)).toEqual({
      classifications: [],
      unsafe_notes: [],
    });
  });

  it('strips markdown code fences', () => {
    const body = {
      outputs: [
        {
          results: {
            message: {
              text: '```json\n{"subject":"Hi","body_text":"Body","confidence":0.9}\n```',
            },
          },
        },
      ],
    };

    expect(extractLangflowRawOutput(body)).toEqual({
      subject: 'Hi',
      body_text: 'Body',
      confidence: 0.9,
    });
  });

  it('reads structured_output when present', () => {
    expect(
      extractLangflowRawOutput({
        structured_output: { ok: true },
      }),
    ).toEqual({ ok: true });
  });
});
