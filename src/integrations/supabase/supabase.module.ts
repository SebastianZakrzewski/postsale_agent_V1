import { Module } from '@nestjs/common';
import { createSupabaseClient } from './supabase.client';
import { SupabaseCarTemplateRepository } from './supabase-car-template.repository';
import { SupabaseIdempotencyRepository } from './supabase-idempotency.repository';
import { SupabasePostsaleWorkflowRepository } from './supabase-postsale-workflow.repository';
import { SupabaseSideEffectRecordRepository } from './supabase-side-effect-record.repository';
import { SupabaseTemplateImportBatchRepository } from './supabase-template-import-batch.repository';
import { SupabaseWorkflowEventRepository } from './supabase-workflow-event.repository';
import { SUPABASE_CLIENT } from './supabase.tokens';

@Module({
  providers: [
    {
      provide: SUPABASE_CLIENT,
      useFactory: () => createSupabaseClient(),
    },
    SupabaseIdempotencyRepository,
    SupabaseWorkflowEventRepository,
    SupabaseSideEffectRecordRepository,
    SupabaseTemplateImportBatchRepository,
    SupabaseCarTemplateRepository,
    SupabasePostsaleWorkflowRepository,
  ],
  exports: [
    SUPABASE_CLIENT,
    SupabaseIdempotencyRepository,
    SupabaseWorkflowEventRepository,
    SupabaseSideEffectRecordRepository,
    SupabaseTemplateImportBatchRepository,
    SupabaseCarTemplateRepository,
    SupabasePostsaleWorkflowRepository,
  ],
})
export class SupabaseIntegrationModule {}
