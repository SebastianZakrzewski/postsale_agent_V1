import {
  CapabilityResult,
  TemplateMatchResult,
  Workflow,
} from '../../../lib/domain';

export type MatchWorkflowTemplateOutcome =
  | {
      type: 'already_matched';
      capability: CapabilityResult;
      workflow: Workflow;
    }
  | {
      type: 'no_match';
      capability: CapabilityResult;
      workflow: Workflow;
      matchResult: TemplateMatchResult;
    };
