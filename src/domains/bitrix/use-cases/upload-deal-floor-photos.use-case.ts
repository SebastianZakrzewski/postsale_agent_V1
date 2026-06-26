import { Inject, Injectable, Logger } from '@nestjs/common';
import { SideEffectRecordStatus, SideEffectType } from '../../../lib/enums';
import { structuredLogFields } from '../../../lib/observability/structured-log-fields';
import {
  BITRIX_PROVIDER,
  BitrixProvider,
} from '../../../integrations/bitrix/bitrix.provider';
import { resolveBitrixFloorPhotosField } from '../config/bitrix-field-mapping';
import { BitrixDealFileUpload } from '../services/bitrix-deal-file-field.builder';
import { SideEffectGuard } from '../../side-effects/guards/side-effect.guard';
import { SideEffectService } from '../../side-effects/services/side-effect.service';
import {
  MESSAGE_ATTACHMENT_REPOSITORY,
  MessageAttachmentRepository,
} from '../../email/repository/message.repository';

export interface UploadDealFloorPhotosCommand {
  workflowId: string;
  bitrixDealId: string;
  customerMessageId: string;
  sourceRefs: string[];
  requestId?: string;
}

export type UploadDealFloorPhotosOutcome =
  | { type: 'uploaded'; uploadedCount: number }
  | { type: 'already_uploaded' }
  | { type: 'skipped'; reason: string };

@Injectable()
export class UploadDealFloorPhotosUseCase {
  private readonly logger = new Logger(UploadDealFloorPhotosUseCase.name);

  constructor(
    @Inject(MESSAGE_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepository: MessageAttachmentRepository,
    @Inject(BITRIX_PROVIDER)
    private readonly bitrixProvider: BitrixProvider,
    private readonly sideEffectService: SideEffectService,
    private readonly sideEffectGuard: SideEffectGuard,
  ) {}

  async execute(
    command: UploadDealFloorPhotosCommand,
  ): Promise<UploadDealFloorPhotosOutcome> {
    if (command.sourceRefs.length === 0) {
      return { type: 'skipped', reason: 'no_photo_source_refs' };
    }

    const attachments = await this.attachmentRepository.findByMessageId(
      command.customerMessageId,
    );
    const sourceRefSet = new Set(command.sourceRefs);
    const uploads = attachments
      .filter(
        (row) =>
          row.storage_ref &&
          sourceRefSet.has(row.storage_ref) &&
          isImageMimeType(row.content_type) &&
          row.content_base64,
      )
      .map(
        (row): BitrixDealFileUpload => ({
          filename: row.filename,
          contentBase64: row.content_base64 as string,
        }),
      );

    if (uploads.length === 0) {
      this.logger.warn(
        structuredLogFields('bitrix.floor_photos.skipped', {
          workflow_id: command.workflowId,
          customer_message_id: command.customerMessageId,
          reason: 'missing_content_base64',
          source_refs: command.sourceRefs.join(','),
        }),
      );
      return { type: 'skipped', reason: 'missing_content_base64' };
    }

    const idempotencyKey = `${command.workflowId}:upload_floor_photos:${command.customerMessageId}`;
    const record = await this.sideEffectService.recordForExecution({
      workflowId: command.workflowId,
      sideEffectType: SideEffectType.UPLOAD_BITRIX_DEAL_PHOTOS,
      idempotencyKey,
      requestId: command.requestId,
    });

    if (record.status === SideEffectRecordStatus.SUCCEEDED) {
      return { type: 'already_uploaded' };
    }

    this.sideEffectGuard.assertCanExecute(record);

    const fieldName = resolveBitrixFloorPhotosField();

    try {
      await this.bitrixProvider.uploadDealFloorPhotos(
        command.bitrixDealId,
        fieldName,
        uploads,
      );
      await this.sideEffectService.markSucceeded(record.id, {
        dealId: command.bitrixDealId,
        fieldName,
        uploadedCount: uploads.length,
      });
      this.logger.log(
        structuredLogFields('bitrix.floor_photos.uploaded', {
          workflow_id: command.workflowId,
          bitrix_deal_id: command.bitrixDealId,
          uploaded_count: String(uploads.length),
          field_name: fieldName,
        }),
      );
      return { type: 'uploaded', uploadedCount: uploads.length };
    } catch (error) {
      await this.sideEffectService.markFailed(
        record.id,
        error instanceof Error ? error.message : 'BITRIX_PHOTO_UPLOAD_FAILED',
        true,
      );
      throw error;
    }
  }
}

function isImageMimeType(contentType: string | null): boolean {
  return (contentType ?? '').trim().toLowerCase().startsWith('image/');
}
