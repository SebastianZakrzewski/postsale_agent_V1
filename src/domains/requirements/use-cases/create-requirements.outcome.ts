import { CapabilityResult, Workflow } from '../../../lib/domain';

export type CreateRequirementsOutcome =
  | {
      type: 'created';
      capability: CapabilityResult;
      workflow: Workflow;
      requirementIds: string[];
    }
  | {
      type: 'already_created';
      capability: CapabilityResult;
      workflow: Workflow;
      requirementIds: string[];
    }
  | {
      type: 'escalated';
      capability: CapabilityResult;
      workflow: Workflow;
      reason: string;
    };
