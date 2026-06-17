import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WebhookAuthGuard } from '../guards/webhook-auth.guard';

@Controller('webhooks')
@UseGuards(WebhookAuthGuard)
export class WebhooksController {
  @Post('workflow/start')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  startWorkflow(): { message: string } {
    return { message: 'Not implemented' };
  }

  @Post('email/inbound')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  ingestEmail(): { message: string } {
    return { message: 'Not implemented' };
  }
}
