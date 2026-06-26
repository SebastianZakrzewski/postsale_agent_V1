import { Workflow } from '../../../lib/domain';
import { CompletionPolicyOutcome } from './completion.policy';

export type FollowupPolicyOutcome = 'ALLOW' | 'WAIT' | 'DENY' | 'ESCALATE';

export interface FollowupPolicyInput {
  workflow: Workflow;
  completionOutcome: CompletionPolicyOutcome;
  now: Date;
  waitingSince: Date;
}

export interface FollowupPolicyResult {
  outcome: FollowupPolicyOutcome;
  reason?: string;
}

const MAX_FOLLOW_UPS = 3;
const FIRST_FOLLOW_UP_DELAY_MS = 24 * 60 * 60 * 1000;
const SUBSEQUENT_FOLLOW_UP_DELAY_MS = 48 * 60 * 60 * 1000;

export function evaluateFollowupPolicy(
  input: FollowupPolicyInput,
): FollowupPolicyResult {
  if (input.completionOutcome === 'PASS') {
    return { outcome: 'DENY', reason: 'completion_ready' };
  }

  if (input.completionOutcome === 'ESCALATE') {
    return { outcome: 'ESCALATE', reason: 'completion_escalate' };
  }

  if (input.workflow.followUpCount >= MAX_FOLLOW_UPS) {
    return { outcome: 'ESCALATE', reason: 'max_follow_ups_reached' };
  }

  const referenceTime =
    input.workflow.followUpCount === 0
      ? input.waitingSince
      : (input.workflow.lastFollowUpAt ?? input.waitingSince);

  const requiredDelayMs =
    input.workflow.followUpCount === 0
      ? FIRST_FOLLOW_UP_DELAY_MS
      : SUBSEQUENT_FOLLOW_UP_DELAY_MS;

  const elapsedMs = input.now.getTime() - referenceTime.getTime();
  if (elapsedMs < requiredDelayMs) {
    return { outcome: 'WAIT', reason: 'follow_up_not_due' };
  }

  return { outcome: 'ALLOW' };
}

export const FOLLOWUP_POLICY_MAX_ATTEMPTS = MAX_FOLLOW_UPS;
