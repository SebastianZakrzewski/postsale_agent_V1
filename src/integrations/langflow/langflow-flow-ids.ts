import {
  LANGFLOW_FLOW_ANALYZE_CUSTOMER_REPLY,
  LANGFLOW_FLOW_CLASSIFY_TEMPLATE_NOTES,
  LANGFLOW_FLOW_DRAFT_FOLLOWUP_EMAIL,
  LANGFLOW_FLOW_DRAFT_INITIAL_EMAIL,
} from '../../domains/langflow/config/langflow-flow-names';

const FLOW_ID_ENV_KEYS: Record<string, string> = {
  [LANGFLOW_FLOW_CLASSIFY_TEMPLATE_NOTES]:
    'LANGFLOW_FLOW_CLASSIFY_TEMPLATE_NOTES',
  [LANGFLOW_FLOW_DRAFT_INITIAL_EMAIL]: 'LANGFLOW_FLOW_DRAFT_INITIAL_EMAIL',
  [LANGFLOW_FLOW_DRAFT_FOLLOWUP_EMAIL]: 'LANGFLOW_FLOW_DRAFT_FOLLOWUP_EMAIL',
  [LANGFLOW_FLOW_ANALYZE_CUSTOMER_REPLY]:
    'LANGFLOW_FLOW_ANALYZE_CUSTOMER_REPLY',
};

export function resolveLangflowFlowId(flowName: string): string {
  const envKey = FLOW_ID_ENV_KEYS[flowName];
  if (!envKey) {
    throw new Error(`No Langflow flow mapping for: ${flowName}`);
  }

  const flowId = process.env[envKey]?.trim();
  if (!flowId) {
    throw new Error(
      `Missing ${envKey} for Langflow flow "${flowName}". Create the flow in Langflow and set its UUID in .env.`,
    );
  }

  return flowId;
}

export function isLangflowConfigured(): boolean {
  const baseUrl = process.env.LANGFLOW_BASE_URL?.trim();
  const apiKey = process.env.LANGFLOW_API_KEY?.trim();
  return Boolean(baseUrl && apiKey);
}
