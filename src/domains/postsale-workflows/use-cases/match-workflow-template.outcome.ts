import {
  CapabilityResult,
  TemplateMatchResult,
  Workflow,
} from '../../../lib/domain';

export type MatchWorkflowTemplateOutcome =
  | {
      type: 'success';
      capability: CapabilityResult;
      workflow: Workflow;
      carTemplateId: string;
    }
  | {
      type: 'already_matched';
      capability: CapabilityResult;
      workflow: Workflow;
      carTemplateId: string | null;
    }
  | {
      type: 'no_match';
      capability: CapabilityResult;
      workflow: Workflow;
      matchResult: TemplateMatchResult;
    };
