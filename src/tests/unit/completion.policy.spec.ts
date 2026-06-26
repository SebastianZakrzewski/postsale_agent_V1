import {
  RequirementLabel,
  RequirementStatus,
  TemplateMatchStatus,
  WorkflowStatus,
} from '../../lib/enums';
import { WorkflowRequirementRow } from '../../lib/persistence';
import { evaluateCompletionPolicy } from '../../domains/postsale-workflows/policies/completion.policy';
import { buildPersistedDealContext } from '../helpers/bitrix-deal-fields';

function requirement(
  overrides: Partial<WorkflowRequirementRow> = {},
): WorkflowRequirementRow {
  return {
    id: overrides.id ?? 'req-1',
    workflow_id: overrides.workflow_id ?? 'wf-1',
    label: overrides.label ?? RequirementLabel.YES_NO_INFO,
    status: overrides.status ?? RequirementStatus.PENDING,
    source_note: overrides.source_note ?? 'note',
    customer_question: overrides.customer_question ?? null,
    source_field: overrides.source_field ?? 'notes_front_3d',
    classification_reason: overrides.classification_reason ?? null,
    confidence: overrides.confidence ?? 0.9,
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
  };
}

describe('CompletionPolicy (baseline case 8)', () => {
  const baseWorkflow = {
    id: 'wf-1',
    bitrixDealId: 'deal-1',
    status: WorkflowStatus.REQUIREMENTS_UPDATED,
    templateMatchStatus: TemplateMatchStatus.MATCHED,
    dealContext: buildPersistedDealContext('deal-1'),
    product: 'Komplet Classic',
    carTemplateId: 'tpl-1',
    followUpCount: 0,
    lastFollowUpAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('returns INCOMPLETE when a required requirement is PENDING', () => {
    const result = evaluateCompletionPolicy({
      workflow: baseWorkflow,
      requirements: [requirement({ status: RequirementStatus.PENDING })],
      evidenceCountByRequirementId: new Map(),
      langflowAnalysisValid: true,
      bitrixCompletionSideEffectSucceeded: false,
    });

    expect(result.outcome).toBe('INCOMPLETE');
    expect(result.reason).toBe('requirements_incomplete');
  });

  it('returns PASS when all requirements VALID with evidence', () => {
    const result = evaluateCompletionPolicy({
      workflow: baseWorkflow,
      requirements: [requirement({ status: RequirementStatus.VALID })],
      evidenceCountByRequirementId: new Map([['req-1', 1]]),
      langflowAnalysisValid: true,
      bitrixCompletionSideEffectSucceeded: false,
    });

    expect(result.outcome).toBe('PASS');
  });

  it('returns INCOMPLETE for VALID without evidence (case 7 regression)', () => {
    const result = evaluateCompletionPolicy({
      workflow: baseWorkflow,
      requirements: [requirement({ status: RequirementStatus.VALID })],
      evidenceCountByRequirementId: new Map(),
      langflowAnalysisValid: true,
      bitrixCompletionSideEffectSucceeded: false,
    });

    expect(result.outcome).toBe('INCOMPLETE');
    expect(result.reason).toBe('valid_without_evidence');
  });
});
