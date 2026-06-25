import { CapabilityResult, Workflow } from '../../../lib/domain';

export type IngestReplyOutcome =
  | {
      type: 'ingested';
      workflow: Workflow;
      customerMessageId: string;
      attachmentIds: string[];
      linkIds: string[];
    }
  | {
      type: 'already_ingested';
      workflow: Workflow;
      customerMessageId: string;
    }
  | {
      type: 'escalated_unmatched';
      reason: string;
      isDuplicate: boolean;
    }
  | {
      type: 'escalated';
      capability: CapabilityResult;
      workflow: Workflow;
      reason: string;
    };
