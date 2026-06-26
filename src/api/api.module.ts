import { Module } from '@nestjs/common';
import { EmailDomainModule } from '../domains/email/email.module';
import { PostsaleWorkflowsModule } from '../domains/postsale-workflows/postsale-workflows.module';
import { RequirementsModule } from '../domains/requirements/requirements.module';
import { HealthController } from './controllers/health.controller';
import { WebhooksController } from './controllers/webhooks.controller';
import { WebhookAuthGuard } from './guards/webhook-auth.guard';

@Module({
  imports: [PostsaleWorkflowsModule, EmailDomainModule, RequirementsModule],
  controllers: [HealthController, WebhooksController],
  providers: [WebhookAuthGuard],
})
export class ApiModule {}
