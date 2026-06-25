import { Module } from '@nestjs/common';
import { SupabaseIntegrationModule } from '../../integrations/supabase/supabase.module';
import { SupabaseOutgoingMessageRepository } from '../../integrations/supabase/supabase-outgoing-message.repository';
import { EmailIntegrationModule } from '../../integrations/email/email.module';
import { LangflowIntegrationModule } from '../../integrations/langflow/langflow.module';
import { AuditModule } from '../audit/audit.module';
import { LangflowDomainModule } from '../langflow/langflow.module';
import { PostsaleWorkflowsModule } from '../postsale-workflows/postsale-workflows.module';
import { RequirementsModule } from '../requirements/requirements.module';
import { SideEffectsModule } from '../side-effects/side-effects.module';
import { OUTGOING_MESSAGE_REPOSITORY } from './repository/message.repository';
import { SendInitialEmailUseCase } from './use-cases/send-initial-email.use-case';

@Module({
  imports: [
    AuditModule,
    EmailIntegrationModule,
    LangflowDomainModule,
    LangflowIntegrationModule,
    PostsaleWorkflowsModule,
    RequirementsModule,
    SideEffectsModule,
    SupabaseIntegrationModule,
  ],
  providers: [
    {
      provide: OUTGOING_MESSAGE_REPOSITORY,
      useExisting: SupabaseOutgoingMessageRepository,
    },
    SendInitialEmailUseCase,
  ],
  exports: [OUTGOING_MESSAGE_REPOSITORY, SendInitialEmailUseCase],
})
export class EmailDomainModule {}
