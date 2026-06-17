import { Module } from '@nestjs/common';
import { SupabaseIntegrationModule } from '../../integrations/supabase/supabase.module';
import { SupabaseSideEffectRecordRepository } from '../../integrations/supabase/supabase-side-effect-record.repository';
import { SideEffectGuard } from './guards/side-effect.guard';
import { SIDE_EFFECT_RECORD_REPOSITORY } from './repository/side-effect-record.repository';
import { SideEffectService } from './services/side-effect.service';
import { RecordSideEffectUseCase } from './use-cases/record-side-effect.use-case';

@Module({
  imports: [SupabaseIntegrationModule],
  providers: [
    {
      provide: SIDE_EFFECT_RECORD_REPOSITORY,
      useExisting: SupabaseSideEffectRecordRepository,
    },
    SideEffectService,
    SideEffectGuard,
    RecordSideEffectUseCase,
  ],
  exports: [SideEffectService, SideEffectGuard, RecordSideEffectUseCase],
})
export class SideEffectsModule {}
