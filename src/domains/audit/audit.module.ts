import { Module } from '@nestjs/common';
import { SupabaseIntegrationModule } from '../../integrations/supabase/supabase.module';
import { SupabaseWorkflowEventRepository } from '../../integrations/supabase/supabase-workflow-event.repository';
import { WORKFLOW_EVENT_REPOSITORY } from './repository/workflow-event.repository';
import { AuditService } from './services/audit.service';
import { EmitWorkflowEventUseCase } from './use-cases/emit-workflow-event.use-case';

@Module({
  imports: [SupabaseIntegrationModule],
  providers: [
    {
      provide: WORKFLOW_EVENT_REPOSITORY,
      useExisting: SupabaseWorkflowEventRepository,
    },
    AuditService,
    EmitWorkflowEventUseCase,
  ],
  exports: [AuditService, EmitWorkflowEventUseCase],
})
export class AuditModule {}
