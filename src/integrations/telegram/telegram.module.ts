import { Module } from '@nestjs/common';
import { TELEGRAM_PROVIDER } from './telegram.provider';
import { StubTelegramProvider } from './stub-telegram.provider';
import { TelegramHttpAdapter } from './telegram-http.adapter';

function createTelegramProvider():
  | StubTelegramProvider
  | TelegramHttpAdapter {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (token && chatId) {
    return new TelegramHttpAdapter(token, chatId);
  }
  return new StubTelegramProvider();
}

@Module({
  providers: [{ provide: TELEGRAM_PROVIDER, useFactory: createTelegramProvider }],
  exports: [TELEGRAM_PROVIDER],
})
export class TelegramIntegrationModule {}
