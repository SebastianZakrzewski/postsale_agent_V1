import { TemplateMatchStatus, WorkflowStatus } from '../../lib/enums';
import {
  evaluateFollowupPolicy,
  FOLLOWUP_POLICY_MAX_ATTEMPTS,
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
    });

    expect(result.outcome).toBe('DENY');
    expect(result.reason).toBe('completion_ready');
  });

  it('allows first follow-up after 24h when INCOMPLETE (case 11)', () => {
    const result = evaluateFollowupPolicy({
      workflow: baseWorkflow,
      completionOutcome: 'INCOMPLETE',
      now: new Date('2026-01-02T01:00:00Z'),
      waitingSince: new Date('2026-01-01T00:00:00Z'),
    });

    expect(result.outcome).toBe('ALLOW');
  });

  it('escalates after max follow-ups (case 12)', () => {
    const result = evaluateFollowupPolicy({
      workflow: {
        ...baseWorkflow,
        followUpCount: FOLLOWUP_POLICY_MAX_ATTEMPTS,
      },
      completionOutcome: 'INCOMPLETE',
      now: new Date('2026-02-01T00:00:00Z'),
      waitingSince: new Date('2026-01-01T00:00:00Z'),
    });

    expect(result.outcome).toBe('ESCALATE');
    expect(result.reason).toBe('max_follow_ups_reached');
  });
});
