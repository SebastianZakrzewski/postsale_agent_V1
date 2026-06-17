import { Injectable, NotImplementedException } from '@nestjs/common';
import {
  EmailProvider,
  SendEmailInput,
  SendEmailResult,
} from './email.provider';

@Injectable()
export class StubEmailProvider extends EmailProvider {
  async send(_input: SendEmailInput): Promise<SendEmailResult> {
    throw new NotImplementedException('EmailProvider stub');
  }
}
