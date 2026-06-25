import { CapabilityResult, Workflow } from '../../../lib/domain';

export type SendInitialEmailOutcome =
  | {
      type: 'sent';
      capability: CapabilityResult;
      workflow: Workflow;
      outgoingMessageId: string;
      providerMessageId: string;
    }
  | {
      type: 'already_sent';
      capability: CapabilityResult;
      workflow: Workflow;
    }
  | {
      type: 'rejected';
      reason: string;
    }
  | {
      type: 'escalated';
      capability: CapabilityResult;
      workflow: Workflow;
      reason: string;
    };
