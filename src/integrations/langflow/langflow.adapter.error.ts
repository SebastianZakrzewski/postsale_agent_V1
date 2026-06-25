export class LangflowInvokeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'LangflowInvokeError';
    this.code = code;
  }
}
