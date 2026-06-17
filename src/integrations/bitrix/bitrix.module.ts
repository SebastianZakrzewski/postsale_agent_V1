import { Module } from '@nestjs/common';
import { BITRIX_PROVIDER } from './bitrix.provider';
import { StubBitrixProvider } from './stub-bitrix.provider';

@Module({
  providers: [{ provide: BITRIX_PROVIDER, useClass: StubBitrixProvider }],
  exports: [BITRIX_PROVIDER],
})
export class BitrixIntegrationModule {}
