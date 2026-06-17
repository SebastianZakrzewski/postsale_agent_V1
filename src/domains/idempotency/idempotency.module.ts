import { Module } from '@nestjs/common';
import { SupabaseIntegrationModule } from '../../integrations/supabase/supabase.module';
import { SupabaseIdempotencyRepository } from '../../integrations/supabase/supabase-idempotency.repository';
import { IDEMPOTENCY_REPOSITORY } from './repository/idempotency.repository';
import { IdempotencyService } from './services/idempotency.service';
import { CheckIdempotencyUseCase } from './use-cases/check-idempotency.use-case';

@Module({
  imports: [SupabaseIntegrationModule],
  providers: [
    {
      provide: IDEMPOTENCY_REPOSITORY,
      useExisting: SupabaseIdempotencyRepository,
    },
    IdempotencyService,
    CheckIdempotencyUseCase,
  ],
  exports: [IdempotencyService, CheckIdempotencyUseCase],
})
export class IdempotencyModule {}
