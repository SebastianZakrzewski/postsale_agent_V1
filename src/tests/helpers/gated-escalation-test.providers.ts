import { EscalateToPendingBitrixUseCase } from '../../domains/postsale-workflows/use-cases/escalate-to-pending-bitrix.use-case';
import { ExecutePendingSideEffectsUseCase } from '../../domains/postsale-workflows/use-cases/execute-pending-side-effects.use-case';
import { UploadDealFloorPhotosUseCase } from '../../domains/bitrix/use-cases/upload-deal-floor-photos.use-case';

export const gatedEscalationTestProviders = [
  {
    provide: EscalateToPendingBitrixUseCase,
    useValue: {
      execute: jest.fn().mockResolvedValue({
        type: 'pending',
        reason: 'test',
      }),
    },
  },
  {
    provide: ExecutePendingSideEffectsUseCase,
    useValue: {
      execute: jest.fn().mockResolvedValue({
        type: 'escalated',
      }),
    },
  },
  {
    provide: UploadDealFloorPhotosUseCase,
    useValue: { execute: jest.fn().mockResolvedValue({ type: 'skipped' }) },
  },
];
