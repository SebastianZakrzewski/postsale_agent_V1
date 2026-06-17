export interface IdempotencyResult {
  isDuplicate: boolean;
  key: string;
  scope: string;
  workflowId?: string;
}
