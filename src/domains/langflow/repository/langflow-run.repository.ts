import { LangflowRunRow } from '../../../lib/persistence';

export abstract class LangflowRunRepository {
  abstract create(
    row: Omit<LangflowRunRow, 'id' | 'created_at'>,
  ): Promise<LangflowRunRow>;
  abstract findByWorkflowId(workflowId: string): Promise<LangflowRunRow[]>;
}

export const LANGFLOW_RUN_REPOSITORY = Symbol('LANGFLOW_RUN_REPOSITORY');
