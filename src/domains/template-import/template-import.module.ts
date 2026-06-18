import { Module } from '@nestjs/common';
import { SupabaseIntegrationModule } from '../../integrations/supabase/supabase.module';
import { SupabaseCarTemplateRepository } from '../../integrations/supabase/supabase-car-template.repository';
import { SupabaseTemplateImportBatchRepository } from '../../integrations/supabase/supabase-template-import-batch.repository';
import { CAR_TEMPLATE_REPOSITORY } from '../template-matching/repository/car-template.repository';
import { TEMPLATE_IMPORT_BATCH_REPOSITORY } from './repository/template-import-batch.repository';
import { TemplateImportService } from './services/template-import.service';
import { TemplateNormalizationService } from './services/template-normalization.service';
import { ImportTemplateBatchUseCase } from './use-cases/import-template-batch.use-case';

@Module({
  imports: [SupabaseIntegrationModule],
  providers: [
    {
      provide: TEMPLATE_IMPORT_BATCH_REPOSITORY,
      useExisting: SupabaseTemplateImportBatchRepository,
    },
    {
      provide: CAR_TEMPLATE_REPOSITORY,
      useExisting: SupabaseCarTemplateRepository,
    },
    TemplateNormalizationService,
    TemplateImportService,
    ImportTemplateBatchUseCase,
  ],
  exports: [
    ImportTemplateBatchUseCase,
    TemplateNormalizationService,
    CAR_TEMPLATE_REPOSITORY,
  ],
})
export class TemplateImportModule {}
