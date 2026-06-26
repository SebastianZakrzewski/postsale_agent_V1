import { Workflow } from '../../../lib/domain';
import { CompletionPolicyOutcome } from './completion.policy';

export type FollowupPolicyOutcome = 'ALLOW' | 'WAIT' | 'DENY' | 'ESCALATE';
export type FollowupPolicyTrigger = 'ACTIVE_REPLY' | 'SILENCE';

export interface FollowupPolicyInput {
  workflow: Workflow;
  completionOutcome: CompletionPolicyOutcome;
  now: Date;
  waitingSince: Date;
  trigger: FollowupPolicyTrigger;
}

export interface FollowupPolicyResult {
  outcome: FollowupPolicyOutcome;
  reason?: string;
}

const MAX_TIMER_FOLLOW_UPS = 3;
const TIMER_FOLLOW_UP_DELAYS_MS = [
  24 * 60 * 60 * 1000,
  48 * 60 * 60 * 1000,
  60 * 60 * 60 * 1000,
] as const;

export function evaluateFollowupPolicy(
  input: FollowupPolicyInput,
): FollowupPolicyResult {
  if (input.completionOutcome === 'PASS') {
    return { outcome: 'DENY', reason: 'completion_ready' };
  }

  if (input.completionOutcome === 'ESCALATE') {
    return { outcome: 'ESCALATE', reason: 'completion_escalate' };
  }

  if (input.trigger === 'ACTIVE_REPLY') {
    return { outcome: 'ALLOW' };
  }

  if (input.workflow.followUpCount >= MAX_TIMER_FOLLOW_UPS) {
    return { outcome: 'ESCALATE', reason: 'max_follow_ups_reached' };
  }

  const referenceTime =
    input.workflow.followUpCount === 0
      ? input.waitingSince
      : (input.workflow.lastFollowUpAt ?? input.waitingSince);

  const requiredDelayMs = resolveTimerDelayMs(input.workflow.followUpCount);
  const elapsedMs = input.now.getTime() - referenceTime.getTime();
  if (elapsedMs < requiredDelayMs) {
    return { outcome: 'WAIT', reason: 'follow_up_not_due' };
  }

  return { outcome: 'ALLOW' };
}

function resolveTimerDelayMs(followUpCount: number): number {
  if (followUpCount < TIMER_FOLLOW_UP_DELAYS_MS.length) {
    return TIMER_FOLLOW_UP_DELAYS_MS[followUpCount];
  }

  return TIMER_FOLLOW_UP_DELAYS_MS[TIMER_FOLLOW_UP_DELAYS_MS.length - 1];
}

export const FOLLOWUP_POLICY_MAX_ATTEMPTS = MAX_TIMER_FOLLOW_UPS;
export const FOLLOWUP_TIMER_DELAYS_MS = TIMER_FOLLOW_UP_DELAYS_MS;
