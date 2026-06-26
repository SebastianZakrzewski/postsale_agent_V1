import { EscalateToPendingBitrixUseCase } from '../../domains/postsale-workflows/use-cases/escalate-to-pending-bitrix.use-case';
import { ExecutePendingSideEffectsUseCase } from '../../domains/postsale-workflows/use-cases/execute-pending-side-effects.use-case';

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
];
