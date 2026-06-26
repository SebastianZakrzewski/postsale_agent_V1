import { Module } from '@nestjs/common';
import { EMAIL_PROVIDER } from './email.provider';
import { N8nEmailAdapter } from './n8n-email.adapter';
import { StubEmailProvider } from './stub-email.provider';

function createEmailProvider(): StubEmailProvider | N8nEmailAdapter {
  const webhookUrl = process.env.EMAIL_PROVIDER?.trim();
  if (webhookUrl?.startsWith('http://') || webhookUrl?.startsWith('https://')) {
    return new N8nEmailAdapter(webhookUrl);
  }
  return new StubEmailProvider();
}

@Module({
  providers: [{ provide: EMAIL_PROVIDER, useFactory: createEmailProvider }],
  exports: [EMAIL_PROVIDER],
})
export class EmailIntegrationModule {}
