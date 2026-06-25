export class RequirementsMissingError extends Error {
  constructor(workflowId: string) {
    super(`Requirements do not exist for workflow: ${workflowId}`);
    this.name = 'RequirementsMissingError';
  }
}

export class InitialEmailForbiddenError extends Error {
  constructor(workflowId: string, reason: string) {
    super(`Initial email forbidden for workflow ${workflowId}: ${reason}`);
    this.name = 'InitialEmailForbiddenError';
  }
}
