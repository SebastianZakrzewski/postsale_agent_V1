import { Module } from '@nestjs/common';
import { TELEGRAM_PROVIDER } from './telegram.provider';
import { StubTelegramProvider } from './stub-telegram.provider';

@Module({
  providers: [{ provide: TELEGRAM_PROVIDER, useClass: StubTelegramProvider }],
  exports: [TELEGRAM_PROVIDER],
})
export class TelegramIntegrationModule {}
