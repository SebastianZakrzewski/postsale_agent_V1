import { Module, forwardRef } from '@nestjs/common';
import { TemplateMatchingModule } from '../template-matching/template-matching.module';
import { SupabaseIntegrationModule } from '../../integrations/supabase/supabase.module';
import { SupabaseWorkflowRequirementRepository } from '../../integrations/supabase/supabase-workflow-requirement.repository';
import { LangflowIntegrationModule } from '../../integrations/langflow/langflow.module';
import { AuditModule } from '../audit/audit.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { LangflowDomainModule } from '../langflow/langflow.module';
import { PostsaleWorkflowsModule } from '../postsale-workflows/postsale-workflows.module';
import { EmailDomainModule } from '../email/email.module';
import { BitrixDomainModule } from '../bitrix/bitrix.module';
import { WORKFLOW_REQUIREMENT_REPOSITORY } from './repository/workflow-requirement.repository';
import { REQUIREMENT_EVIDENCE_REPOSITORY } from './repository/requirement-evidence.repository';
import { NoteSegmentationService } from './services/note-segmentation.service';
import { SelectedTemplateNotesResolver } from './services/selected-template-notes.resolver';
import { CreateRequirementsUseCase } from './use-cases/create-requirements.use-case';
import { AnalyzeReplyUseCase } from './use-cases/analyze-reply.use-case';
import { SupabaseRequirementEvidenceRepository } from '../../integrations/supabase/supabase-requirement-evidence.repository';

@Module({
  imports: [
    AuditModule,
    IdempotencyModule,
    LangflowIntegrationModule,
    LangflowDomainModule,
    forwardRef(() => PostsaleWorkflowsModule),
    SupabaseIntegrationModule,
    TemplateMatchingModule,
    forwardRef(() => EmailDomainModule),
    BitrixDomainModule,
  ],
  providers: [
    {
      provide: WORKFLOW_REQUIREMENT_REPOSITORY,
      useExisting: SupabaseWorkflowRequirementRepository,
    },
    {
      provide: REQUIREMENT_EVIDENCE_REPOSITORY,
      useExisting: SupabaseRequirementEvidenceRepository,
    },
    NoteSegmentationService,
    SelectedTemplateNotesResolver,
    CreateRequirementsUseCase,
    AnalyzeReplyUseCase,
  ],
  exports: [
    WORKFLOW_REQUIREMENT_REPOSITORY,
    REQUIREMENT_EVIDENCE_REPOSITORY,
    CreateRequirementsUseCase,
    AnalyzeReplyUseCase,
  ],
})
export class RequirementsModule {}
