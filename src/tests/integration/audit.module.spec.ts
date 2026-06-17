import { Test, TestingModule } from '@nestjs/testing';
import { AuditModule } from '../../domains/audit/audit.module';
import { EmitWorkflowEventUseCase } from '../../domains/audit/use-cases/emit-workflow-event.use-case';
import {
  AppendWorkflowEventInput,
  WORKFLOW_EVENT_REPOSITORY,
  WorkflowEventRepository,
} from '../../domains/audit/repository/workflow-event.repository';
import { WorkflowEventType } from '../../lib/enums';
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

describe('AuditModule (integration)', () => {
  let useCase: EmitWorkflowEventUseCase;
  let repository: InMemoryWorkflowEventRepository;

  beforeEach(async () => {
    repository = new InMemoryWorkflowEventRepository();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuditModule],
    })
      .overrideProvider(WORKFLOW_EVENT_REPOSITORY)
      .useValue(repository)
      .compile();

    useCase = moduleFixture.get(EmitWorkflowEventUseCase);
  });

  it('persists audit event with correct WorkflowEventType', async () => {
    const event = await useCase.execute({
      workflowId: 'wf-integration-1',
      eventType: WorkflowEventType.DEAL_CONTEXT_LOADED,
      statusBefore: 'STARTED',
      statusAfter: 'CONTEXT_LOADED',
      requestId: 'req-integration-1',
    });

    expect(event.eventType).toBe(WorkflowEventType.DEAL_CONTEXT_LOADED);
    const stored = await repository.findByWorkflowId('wf-integration-1');
    expect(stored).toHaveLength(1);
    expect(stored[0].event_type).toBe(WorkflowEventType.DEAL_CONTEXT_LOADED);
    expect(stored[0].payload).toEqual({
      status_before: 'STARTED',
      status_after: 'CONTEXT_LOADED',
      request_id: 'req-integration-1',
    });
  });
});
