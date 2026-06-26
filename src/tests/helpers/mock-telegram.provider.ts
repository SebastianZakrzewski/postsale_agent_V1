import {
  SendTelegramInput,
  TelegramProvider,
} from '../../integrations/telegram/telegram.provider';

export class MockTelegramProvider extends TelegramProvider {
  private shouldFail = false;
  readonly sentMessages: SendTelegramInput[] = [];

  setShouldFail(value: boolean): void {
    this.shouldFail = value;
  }

  async sendNotification(input: SendTelegramInput): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Telegram send failed (mock)');
    }

    this.sentMessages.push(input);
  }
}
