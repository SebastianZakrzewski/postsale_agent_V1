import { TemplateMatchStatus, WorkflowStatus } from '../../lib/enums';
import {
  evaluateFollowupPolicy,
  FOLLOWUP_POLICY_MAX_ATTEMPTS,
  FOLLOWUP_TIMER_DELAYS_MS,
} from '../../domains/postsale-workflows/policies/followup.policy';
import { buildPersistedDealContext } from '../helpers/bitrix-deal-fields';

const baseWorkflow = {
  id: 'wf-1',
  bitrixDealId: 'deal-1',
  status: WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY,
  templateMatchStatus: TemplateMatchStatus.MATCHED,
  dealContext: buildPersistedDealContext('deal-1'),
  product: 'Komplet Classic',
  carTemplateId: 'tpl-1',
  followUpCount: 0,
  lastFollowUpAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('FollowupPolicy', () => {
  it('denies follow-up when completion is ready (case 11)', () => {
    const result = evaluateFollowupPolicy({
      workflow: baseWorkflow,
      completionOutcome: 'PASS',
      now: new Date('2026-01-03T00:00:00Z'),
      waitingSince: new Date('2026-01-01T00:00:00Z'),
      trigger: 'SILENCE',
    });

    expect(result.outcome).toBe('DENY');
    expect(result.reason).toBe('completion_ready');
  });

  it('allows immediate follow-up after active incomplete reply', () => {
    const result = evaluateFollowupPolicy({
      workflow: {
        ...baseWorkflow,
        status: WorkflowStatus.REQUIREMENTS_UPDATED,
      },
      completionOutcome: 'INCOMPLETE',
      now: new Date('2026-01-01T00:05:00Z'),
      waitingSince: new Date('2026-01-01T00:00:00Z'),
      trigger: 'ACTIVE_REPLY',
    });

    expect(result.outcome).toBe('ALLOW');
  });

  it('waits 24h before first timer follow-up when customer is silent', () => {
    const result = evaluateFollowupPolicy({
      workflow: baseWorkflow,
      completionOutcome: 'INCOMPLETE',
      now: new Date('2026-01-01T12:00:00Z'),
      waitingSince: new Date('2026-01-01T00:00:00Z'),
      trigger: 'SILENCE',
    });

    expect(result.outcome).toBe('WAIT');
    expect(result.reason).toBe('follow_up_not_due');
  });

  it('allows first timer follow-up after 24h silence', () => {
    const waitingSince = new Date('2026-01-01T00:00:00Z');
    const result = evaluateFollowupPolicy({
      workflow: baseWorkflow,
      completionOutcome: 'INCOMPLETE',
      now: new Date(
        waitingSince.getTime() + FOLLOWUP_TIMER_DELAYS_MS[0] + 60_000,
      ),
      waitingSince,
      trigger: 'SILENCE',
    });

    expect(result.outcome).toBe('ALLOW');
  });

  it('waits 48h before second timer follow-up', () => {
    const lastFollowUpAt = new Date('2026-01-02T00:00:00Z');
    const result = evaluateFollowupPolicy({
      workflow: {
        ...baseWorkflow,
        followUpCount: 1,
        lastFollowUpAt,
      },
      completionOutcome: 'INCOMPLETE',
      now: new Date(lastFollowUpAt.getTime() + 24 * 60 * 60 * 1000),
      waitingSince: new Date('2026-01-01T00:00:00Z'),
      trigger: 'SILENCE',
    });

    expect(result.outcome).toBe('WAIT');
    expect(result.reason).toBe('follow_up_not_due');
  });

  it('allows second timer follow-up after 48h since last timer follow-up', () => {
    const lastFollowUpAt = new Date('2026-01-02T00:00:00Z');
    const result = evaluateFollowupPolicy({
      workflow: {
        ...baseWorkflow,
        followUpCount: 1,
        lastFollowUpAt,
      },
      completionOutcome: 'INCOMPLETE',
      now: new Date(
        lastFollowUpAt.getTime() + FOLLOWUP_TIMER_DELAYS_MS[1] + 60_000,
      ),
      waitingSince: new Date('2026-01-01T00:00:00Z'),
      trigger: 'SILENCE',
    });

    expect(result.outcome).toBe('ALLOW');
  });

  it('waits 60h before third timer follow-up', () => {
    const lastFollowUpAt = new Date('2026-01-04T00:00:00Z');
    const result = evaluateFollowupPolicy({
      workflow: {
        ...baseWorkflow,
        followUpCount: 2,
        lastFollowUpAt,
      },
      completionOutcome: 'INCOMPLETE',
      now: new Date(lastFollowUpAt.getTime() + 48 * 60 * 60 * 1000),
      waitingSince: new Date('2026-01-01T00:00:00Z'),
      trigger: 'SILENCE',
    });

    expect(result.outcome).toBe('WAIT');
  });

  it('escalates after max timer follow-ups (case 12)', () => {
    const result = evaluateFollowupPolicy({
      workflow: {
        ...baseWorkflow,
        followUpCount: FOLLOWUP_POLICY_MAX_ATTEMPTS,
      },
      completionOutcome: 'INCOMPLETE',
      now: new Date('2026-02-01T00:00:00Z'),
      waitingSince: new Date('2026-01-01T00:00:00Z'),
      trigger: 'SILENCE',
    });

    expect(result.outcome).toBe('ESCALATE');
    expect(result.reason).toBe('max_follow_ups_reached');
  });

  it('does not escalate active reply follow-ups when timer count is maxed', () => {
    const result = evaluateFollowupPolicy({
      workflow: {
        ...baseWorkflow,
        followUpCount: FOLLOWUP_POLICY_MAX_ATTEMPTS,
        status: WorkflowStatus.REQUIREMENTS_UPDATED,
      },
      completionOutcome: 'INCOMPLETE',
      now: new Date('2026-02-01T00:00:00Z'),
      waitingSince: new Date('2026-01-01T00:00:00Z'),
      trigger: 'ACTIVE_REPLY',
    });

    expect(result.outcome).toBe('ALLOW');
  });
});
