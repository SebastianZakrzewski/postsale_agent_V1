import { LangflowOutput } from './langflow.types';

export abstract class LangflowProvider {
  abstract invoke(
    flowName: string,
    input: Record<string, unknown>,
  ): Promise<LangflowOutput>;
}

export const LANGFLOW_PROVIDER = Symbol('LANGFLOW_PROVIDER');
