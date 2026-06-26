import { WorkflowRequirementRow } from '../../../lib/persistence';

export function mapRequirementForLangflow(row: WorkflowRequirementRow) {
  return {
    id: row.id,
    label: row.label,
    status: row.status,
    sourceNote: row.source_note,
    customerQuestion: row.customer_question ?? row.source_note,
    sourceField: row.source_field,
  };
}
