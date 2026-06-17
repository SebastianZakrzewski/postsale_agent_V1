import { Module } from '@nestjs/common';
import { HealthController } from './controllers/health.controller';
import { WebhooksController } from './controllers/webhooks.controller';
import { WebhookAuthGuard } from './guards/webhook-auth.guard';

@Module({
  controllers: [HealthController, WebhooksController],
  providers: [WebhookAuthGuard],
})
export class ApiModule {}
