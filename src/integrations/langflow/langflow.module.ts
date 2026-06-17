import { Module } from '@nestjs/common';
import { LANGFLOW_PROVIDER } from './langflow.provider';
import { StubLangflowProvider } from './stub-langflow.provider';

@Module({
  providers: [{ provide: LANGFLOW_PROVIDER, useClass: StubLangflowProvider }],
  exports: [LANGFLOW_PROVIDER],
})
export class LangflowIntegrationModule {}
