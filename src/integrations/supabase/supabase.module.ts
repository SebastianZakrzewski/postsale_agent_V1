import { Module } from '@nestjs/common';
import { createSupabaseClient } from './supabase.client';
import { SupabaseCarTemplateRepository } from './supabase-car-template.repository';
import { SupabaseLangflowRunRepository } from './supabase-langflow-run.repository';
import { SupabaseIdempotencyRepository } from './supabase-idempotency.repository';
import { SupabaseOutgoingMessageRepository } from './supabase-outgoing-message.repository';
import { SupabasePostsaleWorkflowRepository } from './supabase-postsale-workflow.repository';
import { SupabaseSideEffectRecordRepository } from './supabase-side-effect-record.repository';
import { SupabaseWorkflowEventRepository } from './supabase-workflow-event.repository';
import { SupabaseWorkflowRequirementRepository } from './supabase-workflow-requirement.repository';
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
    SupabasePostsaleWorkflowRepository,
    SupabaseCarTemplateRepository,
    SupabaseWorkflowRequirementRepository,
    SupabaseLangflowRunRepository,
    SupabaseOutgoingMessageRepository,
  ],
  exports: [
    SUPABASE_CLIENT,
    SupabaseIdempotencyRepository,
    SupabaseWorkflowEventRepository,
    SupabaseSideEffectRecordRepository,
    SupabasePostsaleWorkflowRepository,
    SupabaseCarTemplateRepository,
    SupabaseWorkflowRequirementRepository,
    SupabaseLangflowRunRepository,
    SupabaseOutgoingMessageRepository,
  ],
})
export class SupabaseIntegrationModule {}
