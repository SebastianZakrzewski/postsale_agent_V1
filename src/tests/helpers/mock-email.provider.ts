import { Injectable } from '@nestjs/common';
import {
  EmailProvider,
  SendEmailInput,
  SendEmailResult,
} from '../../integrations/email/email.provider';

@Injectable()
export class MockEmailProvider extends EmailProvider {
  sent: SendEmailInput[] = [];

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    this.sent.push(input);
    return { providerMessageId: `msg-${this.sent.length}` };
  }
}
