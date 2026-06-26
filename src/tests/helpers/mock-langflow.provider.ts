import { Injectable } from '@nestjs/common';
import { LangflowProvider } from '../../integrations/langflow/langflow.provider';
import { LangflowOutput } from '../../integrations/langflow/langflow.types';
import {
  LANGFLOW_FLOW_CLASSIFY_TEMPLATE_NOTES,
  LANGFLOW_FLOW_DRAFT_INITIAL_EMAIL,
  LANGFLOW_FLOW_DRAFT_FOLLOWUP_EMAIL,
  LANGFLOW_FLOW_ANALYZE_CUSTOMER_REPLY,
} from '../../domains/langflow/config/langflow-flow-names';
import { RequirementLabel } from '../../lib/enums';

@Injectable()
export class MockLangflowProvider extends LangflowProvider {
  classifyHandler: (input: Record<string, unknown>) => Record<string, unknown> =
    () => ({
      classifications: [],
      unsafe_notes: [],
    });

  draftHandler: (input: Record<string, unknown>) => Record<string, unknown> =
    () => ({
      subject: 'Test subject',
      body_text: 'Test body',
      confidence: 0.9,
    });

  analyzeReplyHandler: (
    input: Record<string, unknown>,
  ) => Record<string, unknown> = () => ({
    requirement_updates: [],
    unsafe: false,
    proposed_next_action: 'MANUAL_REVIEW',
  });

  async invoke(
    flowName: string,
    input: Record<string, unknown>,
  ): Promise<LangflowOutput> {
    if (flowName === LANGFLOW_FLOW_CLASSIFY_TEMPLATE_NOTES) {
      return {
        flowName,
        raw: this.classifyHandler(input),
      };
    }

    if (flowName === LANGFLOW_FLOW_DRAFT_INITIAL_EMAIL) {
      return {
        flowName,
        raw: this.draftHandler(input),
      };
    }

    if (flowName === LANGFLOW_FLOW_DRAFT_FOLLOWUP_EMAIL) {
      return {
        flowName,
        raw: this.draftHandler(input),
      };
    }

    if (flowName === LANGFLOW_FLOW_ANALYZE_CUSTOMER_REPLY) {
      return {
        flowName,
        raw: this.analyzeReplyHandler(input),
      };
    }

    throw new Error(`Unexpected flow: ${flowName}`);
  }
}

export function buildValidClassificationRaw(
  sourceNote: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    classifications: [
      {
        source_field: 'notes_front_3d',
        source_note: sourceNote,
        requirement_label: RequirementLabel.YES_NO_INFO,
        question_text: `Please confirm: ${sourceNote}`,
        classification_reason: 'test',
        confidence: 0.9,
        unsafe: false,
      },
    ],
    unsafe_notes: [],
    ...overrides,
  };
}
