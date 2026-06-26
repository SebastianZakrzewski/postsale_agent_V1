import { Module } from '@nestjs/common';
import { SupabaseIntegrationModule } from '../../integrations/supabase/supabase.module';
import { SupabaseLangflowRunRepository } from '../../integrations/supabase/supabase-langflow-run.repository';
import { LANGFLOW_RUN_REPOSITORY } from './repository/langflow-run.repository';
import { LangflowRunRecorderService } from './services/langflow-run-recorder.service';

@Module({
  imports: [SupabaseIntegrationModule],
  providers: [
    {
      provide: LANGFLOW_RUN_REPOSITORY,
      useExisting: SupabaseLangflowRunRepository,
    },
    LangflowRunRecorderService,
  ],
  exports: [LANGFLOW_RUN_REPOSITORY, LangflowRunRecorderService],
})
export class LangflowDomainModule {}
