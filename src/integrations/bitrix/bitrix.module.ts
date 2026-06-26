import { Module } from '@nestjs/common';
import { BITRIX_PROVIDER } from './bitrix.provider';
import { BitrixWriteAdapter } from './bitrix-write.adapter';
import { StubBitrixProvider } from './stub-bitrix.provider';

function createBitrixProvider(): StubBitrixProvider | BitrixWriteAdapter {
  const webhookUrl = process.env.BITRIX_WEBHOOK_URL?.trim();
  if (webhookUrl) {
    return new BitrixWriteAdapter(webhookUrl);
  }
  return new StubBitrixProvider();
}

@Module({
  providers: [{ provide: BITRIX_PROVIDER, useFactory: createBitrixProvider }],
  exports: [BITRIX_PROVIDER],
})
export class BitrixIntegrationModule {}
