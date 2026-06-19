import { Module } from '@nestjs/common';
import { ApiModule } from '../../api/api.module';
import { AppConfigModule } from '../../lib/config/app-config.module';
import { AuditModule } from '../../domains/audit/audit.module';
import { IdempotencyModule } from '../../domains/idempotency/idempotency.module';
import { PostsaleWorkflowsModule } from '../../domains/postsale-workflows/postsale-workflows.module';
import { SideEffectsModule } from '../../domains/side-effects/side-effects.module';
import { TemplateImportModule } from '../../domains/template-import/template-import.module';
import { TemplateMatchingModule } from '../../domains/template-matching/template-matching.module';
import { BitrixIntegrationModule } from '../../integrations/bitrix/bitrix.module';
import { EmailIntegrationModule } from '../../integrations/email/email.module';
import { LangflowIntegrationModule } from '../../integrations/langflow/langflow.module';
import { SupabaseIntegrationModule } from '../../integrations/supabase/supabase.module';
import { TelegramIntegrationModule } from '../../integrations/telegram/telegram.module';

@Module({
  imports: [
    AppConfigModule,
    ApiModule,
    PostsaleWorkflowsModule,
    TemplateImportModule,
    TemplateMatchingModule,
    AuditModule,
    IdempotencyModule,
    SideEffectsModule,
    SupabaseIntegrationModule,
    BitrixIntegrationModule,
    LangflowIntegrationModule,
    EmailIntegrationModule,
    TelegramIntegrationModule,
  ],
})
export class AppModule {}
