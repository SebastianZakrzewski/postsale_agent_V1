import { Module } from '@nestjs/common';
import { ApiModule } from '../../api/api.module';
import { AppConfigModule } from '../../lib/config/app-config.module';
import { AuditModule } from '../../domains/audit/audit.module';
import { BitrixDomainModule } from '../../domains/bitrix/bitrix.module';
import { EmailDomainModule } from '../../domains/email/email.module';
import { IdempotencyModule } from '../../domains/idempotency/idempotency.module';
import { LangflowDomainModule } from '../../domains/langflow/langflow.module';
import { PostsaleWorkflowsModule } from '../../domains/postsale-workflows/postsale-workflows.module';
import { RequirementsModule } from '../../domains/requirements/requirements.module';
import { SideEffectsModule } from '../../domains/side-effects/side-effects.module';
import { TelegramDomainModule } from '../../domains/telegram/telegram.module';
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
    RequirementsModule,
    LangflowDomainModule,
    EmailDomainModule,
    BitrixDomainModule,
    TelegramDomainModule,
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
