import {
  CapabilityResult,
  ProposedNextAction,
  Workflow,
} from '../../../lib/domain';

export type AnalyzeReplyOutcome =
  | {
      type: 'analyzed';
      capability: CapabilityResult;
      workflow: Workflow;
      proposedNextAction: ProposedNextAction;
      updatedRequirementIds: string[];
      evidenceIds: string[];
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
