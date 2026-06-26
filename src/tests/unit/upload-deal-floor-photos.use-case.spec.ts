import { Test, TestingModule } from '@nestjs/testing';
import { UploadDealFloorPhotosUseCase } from '../../domains/bitrix/use-cases/upload-deal-floor-photos.use-case';
import { MESSAGE_ATTACHMENT_REPOSITORY } from '../../domains/email/repository/message.repository';
import { SideEffectGuard } from '../../domains/side-effects/guards/side-effect.guard';
import { SideEffectService } from '../../domains/side-effects/services/side-effect.service';
import { BITRIX_PROVIDER } from '../../integrations/bitrix/bitrix.provider';
import { MockBitrixProvider } from '../../integrations/bitrix/mock-bitrix.provider';
import { InMemoryMessageAttachmentRepository } from '../helpers/in-memory-message-attachment.repository';
import { SideEffectRecordStatus, SideEffectType } from '../../lib/enums';

describe('UploadDealFloorPhotosUseCase', () => {
  let useCase: UploadDealFloorPhotosUseCase;
  let bitrix: MockBitrixProvider;
  let attachments: InMemoryMessageAttachmentRepository;
  let sideEffectService: {
    recordForExecution: jest.Mock;
    markSucceeded: jest.Mock;
    markFailed: jest.Mock;
  };

  beforeEach(async () => {
    bitrix = new MockBitrixProvider();
    attachments = new InMemoryMessageAttachmentRepository();
    sideEffectService = {
      recordForExecution: jest.fn().mockResolvedValue({
        id: 'se-1',
        status: SideEffectRecordStatus.PENDING,
      }),
      markSucceeded: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        UploadDealFloorPhotosUseCase,
        { provide: MESSAGE_ATTACHMENT_REPOSITORY, useValue: attachments },
        { provide: BITRIX_PROVIDER, useValue: bitrix },
        { provide: SideEffectService, useValue: sideEffectService },
        {
          provide: SideEffectGuard,
          useValue: { assertCanExecute: jest.fn() },
        },
      ],
    }).compile();

    useCase = moduleFixture.get(UploadDealFloorPhotosUseCase);
  });

  it('uploads image attachments with base64 to Bitrix floor photos field', async () => {
    await attachments.createMany([
      {
        message_id: 'msg-1',
        workflow_id: 'wf-1',
        filename: 'floor.jpg',
        content_type: 'image/jpeg',
        storage_ref: 'gmail:msg-1:bin-1',
        content_base64: 'abc123',
      },
    ]);

    const outcome = await useCase.execute({
      workflowId: 'wf-1',
      bitrixDealId: '35916',
      customerMessageId: 'msg-1',
      sourceRefs: ['gmail:msg-1:bin-1'],
    });

    expect(outcome).toEqual({ type: 'uploaded', uploadedCount: 1 });
    expect(bitrix.getFloorPhotoUploads()).toHaveLength(1);
    expect(bitrix.getFloorPhotoUploads()[0].uploads[0]).toEqual({
      filename: 'floor.jpg',
      contentBase64: 'abc123',
    });
    expect(sideEffectService.recordForExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        sideEffectType: SideEffectType.UPLOAD_BITRIX_DEAL_PHOTOS,
      }),
    );
  });

  it('skips when attachment bytes are missing', async () => {
    await attachments.createMany([
      {
        message_id: 'msg-1',
        workflow_id: 'wf-1',
        filename: 'floor.jpg',
        content_type: 'image/jpeg',
        storage_ref: 'gmail:msg-1:bin-1',
        content_base64: null,
      },
    ]);

    const outcome = await useCase.execute({
      workflowId: 'wf-1',
      bitrixDealId: '35916',
      customerMessageId: 'msg-1',
      sourceRefs: ['gmail:msg-1:bin-1'],
    });

    expect(outcome).toEqual({
      type: 'skipped',
      reason: 'missing_content_base64',
    });
    expect(bitrix.getFloorPhotoUploads()).toHaveLength(0);
  });
});
