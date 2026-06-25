import { LangflowProvider } from './langflow.provider';
import { LangflowOutput } from './langflow.types';
import { LangflowInvokeError } from './langflow.adapter.error';
import { resolveLangflowFlowId } from './langflow-flow-ids';
import { extractLangflowRawOutput } from './langflow-response.parser';

const DEFAULT_TIMEOUT_MS = 120_000;

export interface LangflowAdapterOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class HttpLangflowAdapter extends LangflowProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: LangflowAdapterOptions) {
    super();
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async invoke(
    flowName: string,
    input: Record<string, unknown>,
  ): Promise<LangflowOutput> {
    const flowId = resolveLangflowFlowId(flowName);
    const inputValue = JSON.stringify(input);
    const url = `${this.baseUrl}/api/v1/run/${encodeURIComponent(flowId)}`;

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          input_value: inputValue,
          input_type: 'chat',
          output_type: 'chat',
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Langflow request failed';
      throw new LangflowInvokeError('langflow_request_failed', message);
    }

    const responseText = await response.text();
    if (!response.ok) {
      throw new LangflowInvokeError(
        'langflow_http_error',
        `Langflow HTTP ${response.status}: ${responseText.slice(0, 500)}`,
      );
    }

    let responseBody: unknown;
    try {
      responseBody = JSON.parse(responseText) as unknown;
    } catch {
      throw new LangflowInvokeError(
        'langflow_invalid_response',
        'Langflow response is not valid JSON',
      );
    }

    const raw = extractLangflowRawOutput(responseBody);

    return {
      flowName,
      raw,
    };
  }
}
