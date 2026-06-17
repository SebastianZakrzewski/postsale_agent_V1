import { Injectable, NotImplementedException } from '@nestjs/common';
import { LangflowProvider } from './langflow.provider';
import { LangflowOutput } from './langflow.types';

@Injectable()
export class StubLangflowProvider extends LangflowProvider {
  async invoke(
    _flowName: string,
    _input: Record<string, unknown>,
  ): Promise<LangflowOutput> {
    throw new NotImplementedException('LangflowProvider stub');
  }
}
