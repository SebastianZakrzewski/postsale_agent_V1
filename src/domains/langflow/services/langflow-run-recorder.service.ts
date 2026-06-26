import { Inject, Injectable } from '@nestjs/common';
import {
  LANGFLOW_RUN_REPOSITORY,
  LangflowRunRepository,
} from '../repository/langflow-run.repository';
import { LangflowValidationErrorCode } from '../parsers/langflow-validation-error-codes';

@Injectable()
export class LangflowRunRecorderService {
  constructor(
    @Inject(LANGFLOW_RUN_REPOSITORY)
    private readonly repository: LangflowRunRepository,
  ) {}

  async record(input: {
    workflowId: string;
    flowName: string;
    requestId?: string;
    parsedSuccess: boolean;
    validationErrors: LangflowValidationErrorCode | null;
  }): Promise<string> {
    const row = await this.repository.create({
      workflow_id: input.workflowId,
      flow_name: input.flowName,
      request_id: input.requestId ?? null,
      raw_output: null,
      parsed_success: input.parsedSuccess,
      validation_errors: input.validationErrors,
    });
    return row.id;
  }
}
