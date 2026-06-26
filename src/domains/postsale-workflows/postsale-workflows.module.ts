import { Module } from '@nestjs/common';
import { SupabaseIntegrationModule } from '../../integrations/supabase/supabase.module';
import { SupabasePostsaleWorkflowRepository } from '../../integrations/supabase/supabase-postsale-workflow.repository';
import { SupabaseOutgoingMessageRepository } from '../../integrations/supabase/supabase-outgoing-message.repository';
import { SupabaseWorkflowRequirementRepository } from '../../integrations/supabase/supabase-workflow-requirement.repository';
import { SupabaseRequirementEvidenceRepository } from '../../integrations/supabase/supabase-requirement-evidence.repository';
import { BitrixIntegrationModule } from '../../integrations/bitrix/bitrix.module';
import { TelegramIntegrationModule } from '../../integrations/telegram/telegram.module';
import { EmailIntegrationModule } from '../../integrations/email/email.module';
import { LangflowIntegrationModule } from '../../integrations/langflow/langflow.module';
import { AuditModule } from '../audit/audit.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { TemplateMatchingModule } from '../template-matching/template-matching.module';
import { SideEffectsModule } from '../side-effects/side-effects.module';
import { LangflowDomainModule } from '../langflow/langflow.module';
import { WORKFLOW_REQUIREMENT_REPOSITORY } from '../requirements/repository/workflow-requirement.repository';
import { REQUIREMENT_EVIDENCE_REPOSITORY } from '../requirements/repository/requirement-evidence.repository';
import { OUTGOING_MESSAGE_REPOSITORY } from '../email/repository/message.repository';
import { POSTSALE_WORKFLOW_REPOSITORY } from './repository/postsale-workflow.repository';
import { PolicyContextBuilderService } from './services/policy-context-builder.service';
import { ApplyCompletionPolicyUseCase } from './use-cases/apply-completion-policy.use-case';
import { EscalateWorkflowUseCase } from './use-cases/escalate-workflow.use-case';
import { EscalateToPendingBitrixUseCase } from './use-cases/escalate-to-pending-bitrix.use-case';
import { ExecutePendingSideEffectsUseCase } from './use-cases/execute-pending-side-effects.use-case';
import { FailWorkflowUseCase } from './use-cases/fail-workflow.use-case';
import { GetWorkflowContextUseCase } from './use-cases/get-workflow-context.use-case';
import { LoadDealContextUseCase } from './use-cases/load-deal-context.use-case';
import { MatchWorkflowTemplateUseCase } from './use-cases/match-workflow-template.use-case';
import { ProcessFollowupCheckUseCase } from './use-cases/process-followup-check.use-case';
import { SendFollowupUseCase } from './use-cases/send-followup.use-case';
import { StartWorkflowUseCase } from './use-cases/start-workflow.use-case';

@Module({
  imports: [
    IdempotencyModule,
    AuditModule,
    BitrixIntegrationModule,
    TelegramIntegrationModule,
    EmailIntegrationModule,
    LangflowIntegrationModule,
    LangflowDomainModule,
    SideEffectsModule,
    SupabaseIntegrationModule,
    TemplateMatchingModule,
  ],
  providers: [
    {
      provide: POSTSALE_WORKFLOW_REPOSITORY,
      useExisting: SupabasePostsaleWorkflowRepository,
    },
    {
      provide: WORKFLOW_REQUIREMENT_REPOSITORY,
      useExisting: SupabaseWorkflowRequirementRepository,
    },
    {
      provide: REQUIREMENT_EVIDENCE_REPOSITORY,
      useExisting: SupabaseRequirementEvidenceRepository,
    },
    {
      provide: OUTGOING_MESSAGE_REPOSITORY,
      useExisting: SupabaseOutgoingMessageRepository,
    },
    PolicyContextBuilderService,
    LoadDealContextUseCase,
    MatchWorkflowTemplateUseCase,
    GetWorkflowContextUseCase,
    StartWorkflowUseCase,
    EscalateWorkflowUseCase,
    EscalateToPendingBitrixUseCase,
    FailWorkflowUseCase,
    ApplyCompletionPolicyUseCase,
    SendFollowupUseCase,
    ProcessFollowupCheckUseCase,
    ExecutePendingSideEffectsUseCase,
  ],
  exports: [
    POSTSALE_WORKFLOW_REPOSITORY,
    LoadDealContextUseCase,
    MatchWorkflowTemplateUseCase,
    GetWorkflowContextUseCase,
    StartWorkflowUseCase,
    EscalateWorkflowUseCase,
    EscalateToPendingBitrixUseCase,
    FailWorkflowUseCase,
    ApplyCompletionPolicyUseCase,
    SendFollowupUseCase,
    ProcessFollowupCheckUseCase,
    ExecutePendingSideEffectsUseCase,
  ],
})
export class PostsaleWorkflowsModule {}
