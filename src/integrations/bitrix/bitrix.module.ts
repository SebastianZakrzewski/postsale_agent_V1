import { Module } from '@nestjs/common';
import { BITRIX_PROVIDER } from './bitrix.provider';
import { BitrixReadAdapter } from './bitrix-read.adapter';
import { StubBitrixProvider } from './stub-bitrix.provider';

function createBitrixProvider(): StubBitrixProvider | BitrixReadAdapter {
  const webhookUrl = process.env.BITRIX_WEBHOOK_URL?.trim();
  if (webhookUrl) {
    return new BitrixReadAdapter(webhookUrl);
  }
  return new StubBitrixProvider();
}

@Module({
  providers: [{ provide: BITRIX_PROVIDER, useFactory: createBitrixProvider }],
  exports: [BITRIX_PROVIDER],
})
export class BitrixIntegrationModule {}
