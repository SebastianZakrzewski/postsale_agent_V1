import { Module } from '@nestjs/common';
import { LANGFLOW_PROVIDER } from './langflow.provider';
import { HttpLangflowAdapter } from './langflow.adapter';
import { isLangflowConfigured } from './langflow-flow-ids';
import { StubLangflowProvider } from './stub-langflow.provider';

function createLangflowProvider(): StubLangflowProvider | HttpLangflowAdapter {
  if (!isLangflowConfigured()) {
    return new StubLangflowProvider();
  }

  return new HttpLangflowAdapter({
    baseUrl: process.env.LANGFLOW_BASE_URL!.trim(),
    apiKey: process.env.LANGFLOW_API_KEY!.trim(),
  });
}

@Module({
  providers: [
    { provide: LANGFLOW_PROVIDER, useFactory: createLangflowProvider },
  ],
  exports: [LANGFLOW_PROVIDER],
})
export class LangflowIntegrationModule {}
