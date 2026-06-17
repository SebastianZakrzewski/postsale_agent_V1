export interface LangflowOutput {
  flowName: string;
  raw: Record<string, unknown>;
}

export interface LangflowOutputParser<T> {
  parse(output: LangflowOutput): T;
}
