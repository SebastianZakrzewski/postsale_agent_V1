import { CapabilityResult, Workflow } from '../../../lib/domain';

export type LoadDealContextOutcome =
  | { type: 'success'; capability: CapabilityResult; workflow: Workflow }
  | { type: 'already_loaded'; capability: CapabilityResult; workflow: Workflow }
  | { type: 'parse_failed'; reason: string; missingFields: string[] };
