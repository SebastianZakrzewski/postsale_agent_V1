import { Module } from '@nestjs/common';
import { PostsaleWorkflowsModule } from '../domains/postsale-workflows/postsale-workflows.module';
import { HealthController } from './controllers/health.controller';
import { WebhooksController } from './controllers/webhooks.controller';
import { WebhookAuthGuard } from './guards/webhook-auth.guard';

@Module({
  imports: [PostsaleWorkflowsModule],
  controllers: [HealthController, WebhooksController],
  providers: [WebhookAuthGuard],
})
export class ApiModule {}
