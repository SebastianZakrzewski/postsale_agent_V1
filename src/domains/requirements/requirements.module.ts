import { Module } from '@nestjs/common';
import { SupabaseIntegrationModule } from '../../integrations/supabase/supabase.module';
import { SupabaseWorkflowRequirementRepository } from '../../integrations/supabase/supabase-workflow-requirement.repository';
import { LangflowIntegrationModule } from '../../integrations/langflow/langflow.module';
import { AuditModule } from '../audit/audit.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { LangflowDomainModule } from '../langflow/langflow.module';
import { PostsaleWorkflowsModule } from '../postsale-workflows/postsale-workflows.module';
import { TemplateMatchingModule } from '../template-matching/template-matching.module';
import { WORKFLOW_REQUIREMENT_REPOSITORY } from './repository/workflow-requirement.repository';
import { SelectedTemplateNotesResolver } from './services/selected-template-notes.resolver';
import { CreateRequirementsUseCase } from './use-cases/create-requirements.use-case';

@Module({
  imports: [
    AuditModule,
    IdempotencyModule,
    LangflowIntegrationModule,
    LangflowDomainModule,
    PostsaleWorkflowsModule,
    SupabaseIntegrationModule,
    TemplateMatchingModule,
  ],
  providers: [
    {
      provide: WORKFLOW_REQUIREMENT_REPOSITORY,
      useExisting: SupabaseWorkflowRequirementRepository,
    },
    SelectedTemplateNotesResolver,
    CreateRequirementsUseCase,
  ],
  exports: [WORKFLOW_REQUIREMENT_REPOSITORY, CreateRequirementsUseCase],
})
export class RequirementsModule {}
