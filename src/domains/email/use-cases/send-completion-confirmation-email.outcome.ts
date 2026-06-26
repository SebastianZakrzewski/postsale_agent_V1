import { CapabilityResult } from '../../../lib/domain';
import { Workflow } from '../../../lib/domain/workflow.domain';

export type SendCompletionConfirmationEmailOutcome =
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
    };
