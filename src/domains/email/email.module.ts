import { Module, forwardRef } from '@nestjs/common';
import { SupabaseIntegrationModule } from '../../integrations/supabase/supabase.module';
import { SupabaseOutgoingMessageRepository } from '../../integrations/supabase/supabase-outgoing-message.repository';
import { EmailIntegrationModule } from '../../integrations/email/email.module';
import { LangflowIntegrationModule } from '../../integrations/langflow/langflow.module';
import { AuditModule } from '../audit/audit.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { LangflowDomainModule } from '../langflow/langflow.module';
import { PostsaleWorkflowsModule } from '../postsale-workflows/postsale-workflows.module';
import { RequirementsModule } from '../requirements/requirements.module';
import { SideEffectsModule } from '../side-effects/side-effects.module';
import {
  CUSTOMER_MESSAGE_REPOSITORY,
  MESSAGE_ATTACHMENT_REPOSITORY,
  MESSAGE_LINK_REPOSITORY,
  OUTGOING_MESSAGE_REPOSITORY,
} from './repository/message.repository';
import { SendInitialEmailUseCase } from './use-cases/send-initial-email.use-case';
import { SendCompletionConfirmationEmailUseCase } from './use-cases/send-completion-confirmation-email.use-case';
import { IngestReplyUseCase } from './use-cases/ingest-reply.use-case';
import { EscalateUnmatchedReplyUseCase } from './use-cases/escalate-unmatched-reply.use-case';
import { ReplyWorkflowMatcherService } from './services/reply-workflow-matcher.service';
import { SupabaseCustomerMessageRepository } from '../../integrations/supabase/supabase-customer-message.repository';
import { SupabaseMessageAttachmentRepository } from '../../integrations/supabase/supabase-message-attachment.repository';
import { SupabaseMessageLinkRepository } from '../../integrations/supabase/supabase-message-link.repository';

@Module({
  imports: [
    AuditModule,
    EmailIntegrationModule,
    IdempotencyModule,
    LangflowDomainModule,
    LangflowIntegrationModule,
    forwardRef(() => PostsaleWorkflowsModule),
    forwardRef(() => RequirementsModule),
    SideEffectsModule,
    SupabaseIntegrationModule,
  ],
  providers: [
    {
      provide: OUTGOING_MESSAGE_REPOSITORY,
      useExisting: SupabaseOutgoingMessageRepository,
    },
    {
      provide: CUSTOMER_MESSAGE_REPOSITORY,
      useExisting: SupabaseCustomerMessageRepository,
    },
    {
      provide: MESSAGE_ATTACHMENT_REPOSITORY,
      useExisting: SupabaseMessageAttachmentRepository,
    },
    {
      provide: MESSAGE_LINK_REPOSITORY,
      useExisting: SupabaseMessageLinkRepository,
    },
    ReplyWorkflowMatcherService,
    EscalateUnmatchedReplyUseCase,
    SendInitialEmailUseCase,
    SendCompletionConfirmationEmailUseCase,
    IngestReplyUseCase,
  ],
  exports: [
    OUTGOING_MESSAGE_REPOSITORY,
    CUSTOMER_MESSAGE_REPOSITORY,
    MESSAGE_ATTACHMENT_REPOSITORY,
    MESSAGE_LINK_REPOSITORY,
    SendInitialEmailUseCase,
    SendCompletionConfirmationEmailUseCase,
    IngestReplyUseCase,
  ],
})
export class EmailDomainModule {}
