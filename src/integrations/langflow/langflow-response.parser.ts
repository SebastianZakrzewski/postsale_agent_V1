import { LangflowInvokeError } from './langflow.adapter.error';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readMessageText(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const message = value.message;
  if (typeof message === 'string' && message.trim().length > 0) {
    return message.trim();
  }

  const text = value.text;
  if (typeof text === 'string' && text.trim().length > 0) {
    return text.trim();
  }

  return null;
}

function collectCandidateTexts(node: unknown, texts: string[]): void {
  if (typeof node === 'string') {
    if (node.trim().length > 0) {
      texts.push(node.trim());
    }
    return;
  }

  if (!isRecord(node)) {
    return;
  }

  const directText = readMessageText(node.results ?? node);
  if (directText) {
    texts.push(directText);
  }

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        collectCandidateTexts(item, texts);
      }
    } else if (isRecord(value)) {
      collectCandidateTexts(value, texts);
    }
  }
}

function stripMarkdownJsonFence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  return text.trim();
}

function parseJsonObject(text: string): Record<string, unknown> {
  const normalized = stripMarkdownJsonFence(text);
  const parsed: unknown = JSON.parse(normalized);
  if (!isRecord(parsed)) {
    throw new LangflowInvokeError(
      'langflow_output_not_object',
      'Langflow output JSON is not an object',
    );
  }
  return parsed;
}

export function extractLangflowRawOutput(
  responseBody: unknown,
): Record<string, unknown> {
  if (isRecord(responseBody) && isRecord(responseBody.data)) {
    return extractLangflowRawOutput(responseBody.data);
  }

  if (isRecord(responseBody)) {
    const structured = responseBody.structured_output;
    if (isRecord(structured)) {
      return structured;
    }
  }

  const texts: string[] = [];
  collectCandidateTexts(responseBody, texts);

  for (const text of texts) {
    try {
      return parseJsonObject(text);
    } catch (error) {
      if (error instanceof LangflowInvokeError) {
        continue;
      }
      if (error instanceof SyntaxError) {
        continue;
      }
      throw error;
    }
  }

  throw new LangflowInvokeError(
    'langflow_output_parse_failed',
    'Could not extract JSON object from Langflow run response',
  );
}
