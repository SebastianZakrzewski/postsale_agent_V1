import { Injectable, NotImplementedException } from '@nestjs/common';
import { TelegramProvider, SendTelegramInput } from './telegram.provider';

@Injectable()
export class StubTelegramProvider extends TelegramProvider {
  async sendNotification(_input: SendTelegramInput): Promise<void> {
    throw new NotImplementedException('TelegramProvider stub');
  }
}
