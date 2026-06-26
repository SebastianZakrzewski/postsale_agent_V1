import { WorkflowStatus } from '../../lib/enums';
import {
  allowedNextActionsForStatus,
  buildCapabilityResult,
  isCapabilityDone,
  isCapabilitySoftStop,
} from '../../lib/domain';

describe('workflow-capability helpers', () => {
  it('maps allowed next actions by status', () => {
    expect(allowedNextActionsForStatus(WorkflowStatus.STARTED)).toEqual([
      'load_deal_context',
      'fail_workflow',
    ]);
    expect(
      allowedNextActionsForStatus(WorkflowStatus.CONTEXT_LOADED),
    ).toContain('match_template');
    expect(allowedNextActionsForStatus(WorkflowStatus.COMPLETED)).toEqual([]);
  });

  it('builds capability result with termination flags', () => {
    const terminal = buildCapabilityResult({
      id: 'wf-1',
      bitrixDealId: 'deal-1',
      status: WorkflowStatus.ESCALATED,
      templateMatchStatus: null,
      dealContext: null,
      product: null,
      carTemplateId: null,
      followUpCount: 0,
      lastFollowUpAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(terminal.done).toBe(true);
    expect(terminal.softStop).toBe(false);

    const waiting = buildCapabilityResult({
      id: 'wf-2',
      bitrixDealId: 'deal-2',
      status: WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY,
      templateMatchStatus: null,
      dealContext: null,
      product: null,
      carTemplateId: null,
      followUpCount: 0,
      lastFollowUpAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(waiting.done).toBe(false);
    expect(waiting.softStop).toBe(true);
    expect(isCapabilityDone(WorkflowStatus.FAILED)).toBe(true);
    expect(
      isCapabilitySoftStop(WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY),
    ).toBe(true);
  });
});
