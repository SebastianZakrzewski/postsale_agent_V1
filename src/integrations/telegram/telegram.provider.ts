export interface SendTelegramInput {
  message: string;
}

export abstract class TelegramProvider {
  abstract sendNotification(input: SendTelegramInput): Promise<void>;
}

export const TELEGRAM_PROVIDER = Symbol('TELEGRAM_PROVIDER');
