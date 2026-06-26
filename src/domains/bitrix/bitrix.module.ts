import { Module } from '@nestjs/common';
import { BitrixIntegrationModule } from '../../integrations/bitrix/bitrix.module';
import { SupabaseIntegrationModule } from '../../integrations/supabase/supabase.module';
import { SupabaseMessageAttachmentRepository } from '../../integrations/supabase/supabase-message-attachment.repository';
import { SideEffectsModule } from '../side-effects/side-effects.module';
import { MESSAGE_ATTACHMENT_REPOSITORY } from '../email/repository/message.repository';
import { UploadDealFloorPhotosUseCase } from './use-cases/upload-deal-floor-photos.use-case';

@Module({
  imports: [
    BitrixIntegrationModule,
    SideEffectsModule,
    SupabaseIntegrationModule,
  ],
  providers: [
    {
      provide: MESSAGE_ATTACHMENT_REPOSITORY,
      useExisting: SupabaseMessageAttachmentRepository,
    },
    UploadDealFloorPhotosUseCase,
  ],
  exports: [UploadDealFloorPhotosUseCase],
})
export class BitrixDomainModule {}
