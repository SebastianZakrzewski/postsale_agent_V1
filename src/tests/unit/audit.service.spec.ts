import { InvalidWorkflowEventTypeError } from '../../domains/audit/audit-payload';
import { AuditService } from '../../domains/audit/services/audit.service';
import {
  AppendWorkflowEventInput,
  WorkflowEventRepository,
} from '../../domains/audit/repository/workflow-event.repository';
import { WorkflowStatus, WorkflowEventType } from '../../lib/enums';
import { WorkflowEventRow } from '../../lib/persistence';

class InMemoryWorkflowEventRepository extends WorkflowEventRepository {
  private readonly events: WorkflowEventRow[] = [];

  async append(input: AppendWorkflowEventInput): Promise<WorkflowEventRow> {
    const payload: Record<string, unknown> = { ...(input.payload ?? {}) };
    if (input.statusBefore !== undefined) {
      payload.status_before = input.statusBefore;
    }
    if (input.statusAfter !== undefined) {
      payload.status_after = input.statusAfter;
    }
    if (input.requestId !== undefined) {
      payload.request_id = input.requestId;
    }

    const row: WorkflowEventRow = {
      id: `event-${this.events.length + 1}`,
      workflow_id: input.workflowId,
      event_type: input.eventType,
      payload: Object.keys(payload).length > 0 ? payload : null,
      created_at: new Date().toISOString(),
    };
    this.events.push(row);
    return row;
  }

  async findByWorkflowId(workflowId: string): Promise<WorkflowEventRow[]> {
    return this.events.filter((e) => e.workflow_id === workflowId);
  }
}

describe('AuditService', () => {
  let service: AuditService;
  let repository: InMemoryWorkflowEventRepository;

  beforeEach(() => {
    repository = new InMemoryWorkflowEventRepository();
    service = new AuditService(repository);
  });

  it('emits WORKFLOW_STARTED with status_before and status_after in payload', async () => {
    const event = await service.emit({
      workflowId: 'wf-1',
      eventType: WorkflowEventType.WORKFLOW_STARTED,
      statusBefore: WorkflowStatus.STARTED,
      statusAfter: WorkflowStatus.CONTEXT_LOADED,
    });

    expect(event.eventType).toBe(WorkflowEventType.WORKFLOW_STARTED);
    expect(event.payload).toEqual({
      status_before: WorkflowStatus.STARTED,
      status_after: WorkflowStatus.CONTEXT_LOADED,
    });
  });

  it('includes request_id in audit payload when provided', async () => {
    const event = await service.emit({
      workflowId: 'wf-1',
      eventType: WorkflowEventType.WORKFLOW_STARTED,
      requestId: 'req-abc-123',
    });

    expect(event.payload).toEqual({ request_id: 'req-abc-123' });
  });

  it('rejects WorkflowStatus value used as WorkflowEventType', async () => {
    await expect(
      service.emit({
        workflowId: 'wf-1',
        eventType: WorkflowStatus.STARTED as unknown as WorkflowEventType,
      }),
    ).rejects.toBeInstanceOf(InvalidWorkflowEventTypeError);
  });
});

describe('AuditService concurrent emit', () => {
  it('returns the event inserted by append, not another concurrent emit', async () => {
    class ConcurrentWorkflowEventRepository extends WorkflowEventRepository {
      private readonly events: WorkflowEventRow[] = [];

      async append(input: AppendWorkflowEventInput): Promise<WorkflowEventRow> {
        const row: WorkflowEventRow = {
          id: `event-${input.eventType}-${this.events.length + 1}`,
          workflow_id: input.workflowId,
          event_type: input.eventType,
          payload: input.requestId ? { request_id: input.requestId } : null,
          created_at: new Date().toISOString(),
        };
        this.events.push(row);
        return row;
      }

      async findByWorkflowId(workflowId: string): Promise<WorkflowEventRow[]> {
        return this.events.filter((e) => e.workflow_id === workflowId);
      }
    }

    const repository = new ConcurrentWorkflowEventRepository();
    const service = new AuditService(repository);

    const [first, second] = await Promise.all([
      service.emit({
        workflowId: 'wf-race',
        eventType: WorkflowEventType.WORKFLOW_STARTED,
        requestId: 'req-first',
      }),
      service.emit({
        workflowId: 'wf-race',
        eventType: WorkflowEventType.DEAL_CONTEXT_LOADED,
        requestId: 'req-second',
      }),
    ]);

    expect(first.eventType).toBe(WorkflowEventType.WORKFLOW_STARTED);
    expect(first.payload).toEqual({ request_id: 'req-first' });
    expect(second.eventType).toBe(WorkflowEventType.DEAL_CONTEXT_LOADED);
    expect(second.payload).toEqual({ request_id: 'req-second' });
  });
});
