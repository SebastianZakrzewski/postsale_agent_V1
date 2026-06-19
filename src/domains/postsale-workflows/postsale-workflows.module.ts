import { Module } from '@nestjs/common';
import { SupabaseIntegrationModule } from '../../integrations/supabase/supabase.module';
import { SupabasePostsaleWorkflowRepository } from '../../integrations/supabase/supabase-postsale-workflow.repository';
import { BitrixIntegrationModule } from '../../integrations/bitrix/bitrix.module';
import { AuditModule } from '../audit/audit.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { TemplateMatchingModule } from '../template-matching/template-matching.module';
import { POSTSALE_WORKFLOW_REPOSITORY } from './repository/postsale-workflow.repository';
import { EscalateWorkflowUseCase } from './use-cases/escalate-workflow.use-case';
import { FailWorkflowUseCase } from './use-cases/fail-workflow.use-case';
import { GetWorkflowContextUseCase } from './use-cases/get-workflow-context.use-case';
import { LoadDealContextUseCase } from './use-cases/load-deal-context.use-case';
import { MatchWorkflowTemplateUseCase } from './use-cases/match-workflow-template.use-case';
import { StartWorkflowUseCase } from './use-cases/start-workflow.use-case';

@Module({
  imports: [
    IdempotencyModule,
    AuditModule,
    TemplateMatchingModule,
    BitrixIntegrationModule,
    SupabaseIntegrationModule,
  ],
  providers: [
    {
      provide: POSTSALE_WORKFLOW_REPOSITORY,
      useExisting: SupabasePostsaleWorkflowRepository,
    },
    LoadDealContextUseCase,
    MatchWorkflowTemplateUseCase,
    GetWorkflowContextUseCase,
    StartWorkflowUseCase,
    EscalateWorkflowUseCase,
    FailWorkflowUseCase,
  ],
  exports: [
    LoadDealContextUseCase,
    MatchWorkflowTemplateUseCase,
    GetWorkflowContextUseCase,
    StartWorkflowUseCase,
    EscalateWorkflowUseCase,
    FailWorkflowUseCase,
  ],
})
export class PostsaleWorkflowsModule {}
