export type EscalationPolicyReason =
  | 'max_follow_ups_reached'
  | 'completion_escalate'
  | 'policy_escalation';

export interface EscalationPolicyInput {
  reason: EscalationPolicyReason;
}

export interface EscalationPolicyResult {
  shouldEscalate: boolean;
  reason: EscalationPolicyReason;
}

export function evaluateEscalationPolicy(
  input: EscalationPolicyInput,
): EscalationPolicyResult {
  return {
    shouldEscalate: true,
    reason: input.reason,
  };
}
