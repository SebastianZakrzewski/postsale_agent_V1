import { Module } from '@nestjs/common';
import { createSupabaseClient } from './supabase.client';
import { SupabaseIdempotencyRepository } from './supabase-idempotency.repository';
import { SupabaseSideEffectRecordRepository } from './supabase-side-effect-record.repository';
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
  ],
  exports: [
    SUPABASE_CLIENT,
    SupabaseIdempotencyRepository,
    SupabaseWorkflowEventRepository,
    SupabaseSideEffectRecordRepository,
  ],
})
export class SupabaseIntegrationModule {}
