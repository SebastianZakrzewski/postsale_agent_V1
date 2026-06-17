import { WorkflowStatus } from '../../lib/enums/workflow-status.enum';
import { WorkflowEventType } from '../../lib/enums/workflow-event-type.enum';

describe('Enum separation', () => {
  it('WorkflowStatus and WorkflowEventType are separate enums with no overlapping values', () => {
    const statusValues = Object.values(WorkflowStatus);
    const eventValues = Object.values(WorkflowEventType);

    expect(statusValues.length).toBeGreaterThan(0);
    expect(eventValues.length).toBeGreaterThan(0);

    const overlap = statusValues.filter((value) =>
      eventValues.includes(value as unknown as WorkflowEventType),
    );

    expect(overlap).toEqual([]);
  });

  it('WorkflowStatus STARTED is not a WorkflowEventType', () => {
    expect(WorkflowStatus.STARTED).toBe('STARTED');
    expect(Object.values(WorkflowEventType)).not.toContain(
      WorkflowStatus.STARTED,
    );
  });

  it('WorkflowEventType WORKFLOW_STARTED is not a WorkflowStatus', () => {
    expect(WorkflowEventType.WORKFLOW_STARTED).toBe('WORKFLOW_STARTED');
    expect(Object.values(WorkflowStatus)).not.toContain(
      WorkflowEventType.WORKFLOW_STARTED,
    );
  });
});
