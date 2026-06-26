import { CapabilityResult, Workflow } from '../../../lib/domain';

export type SendFollowupOutcome =
  | {
      type: 'sent';
      capability: CapabilityResult;
      workflow: Workflow;
      outgoingMessageId: string;
      providerMessageId: string;
      followUpNumber?: number;
    }
  | {
      type: 'not_due';
      capability: CapabilityResult;
      workflow: Workflow;
    }
  | {
      type: 'escalated';
      capability: CapabilityResult;
      workflow: Workflow;
      reason: string;
    }
  | {
      type: 'rejected';
      reason: string;
    };
