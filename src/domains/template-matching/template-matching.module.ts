import { Module } from '@nestjs/common';
import { SupabaseIntegrationModule } from '../../integrations/supabase/supabase.module';
import { SupabaseCarTemplateRepository } from '../../integrations/supabase/supabase-car-template.repository';
import {
  CAR_TEMPLATE_REPOSITORY,
  CarTemplateRepository,
} from './repository/car-template.repository.port';
import { TemplateMatchingService } from './services/template-matching.service';
import { TemplateNoteSelectionService } from './services/template-note-selection.service';

@Module({
  imports: [SupabaseIntegrationModule],
  providers: [
    {
      provide: CAR_TEMPLATE_REPOSITORY,
      useExisting: SupabaseCarTemplateRepository,
    },
    {
      provide: CarTemplateRepository,
      useExisting: SupabaseCarTemplateRepository,
    },
    TemplateMatchingService,
    TemplateNoteSelectionService,
  ],
  exports: [
    CAR_TEMPLATE_REPOSITORY,
    CarTemplateRepository,
    TemplateMatchingService,
    TemplateNoteSelectionService,
  ],
})
export class TemplateMatchingModule {}
