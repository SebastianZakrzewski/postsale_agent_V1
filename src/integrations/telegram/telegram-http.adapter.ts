import { TelegramProvider, SendTelegramInput } from './telegram.provider';

export class TelegramHttpAdapter extends TelegramProvider {
  constructor(
    private readonly botToken: string,
    private readonly chatId: string,
  ) {
    super();
  }

  async sendNotification(input: SendTelegramInput): Promise<void> {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.chatId,
        text: input.message,
      }),
    });

    if (!response.ok) {
      throw new Error(`Telegram HTTP ${response.status}`);
    }
  }
}
