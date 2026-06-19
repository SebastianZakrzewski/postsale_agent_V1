import { WorkflowStatus } from '../enums';
import { CapabilityResult } from './capability-result.domain';
import { Workflow } from './workflow.domain';

const TERMINAL_STATUSES: WorkflowStatus[] = [
  WorkflowStatus.COMPLETED,
  WorkflowStatus.ESCALATED,
  WorkflowStatus.FAILED,
];

export function allowedNextActionsForStatus(status: WorkflowStatus): string[] {
  switch (status) {
    case WorkflowStatus.STARTED:
      return ['load_deal_context', 'fail_workflow'];
    case WorkflowStatus.CONTEXT_LOADED:
      return ['match_template', 'escalate_workflow', 'fail_workflow'];
    case WorkflowStatus.TEMPLATE_MATCHED:
      return ['create_requirements', 'escalate_workflow'];
    case WorkflowStatus.REQUIREMENTS_CREATED:
      return ['send_initial_email', 'escalate_workflow'];
    case WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY:
      return ['ingest_customer_reply'];
    case WorkflowStatus.REQUIREMENTS_UPDATED:
      return ['analyze_reply', 'escalate_workflow'];
    default:
      return [];
  }
}

export function isCapabilityDone(status: WorkflowStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function isCapabilitySoftStop(status: WorkflowStatus): boolean {
  return status === WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY;
}

export function buildCapabilityResult(workflow: Workflow): CapabilityResult {
  return {
    workflowId: workflow.id,
    status: workflow.status,
    done: isCapabilityDone(workflow.status),
    softStop: isCapabilitySoftStop(workflow.status),
    allowedNextActions: allowedNextActionsForStatus(workflow.status),
  };
}

export function isContextLoadedStatus(status: WorkflowStatus): boolean {
  return [
    WorkflowStatus.CONTEXT_LOADED,
    WorkflowStatus.TEMPLATE_MATCHED,
    WorkflowStatus.REQUIREMENTS_CREATED,
    WorkflowStatus.WAITING_FOR_CUSTOMER_REPLY,
    WorkflowStatus.REQUIREMENTS_UPDATED,
    WorkflowStatus.COMPLETION_PENDING_BITRIX_UPDATE,
    WorkflowStatus.COMPLETED,
  ].includes(status);
}
