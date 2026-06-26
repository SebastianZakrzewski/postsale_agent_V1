import { RequirementEvidenceRow } from '../../../lib/persistence';

export abstract class RequirementEvidenceRepository {
  abstract createMany(
    rows: Array<
      Omit<RequirementEvidenceRow, 'id' | 'created_at' | 'updated_at'>
    >,
  ): Promise<RequirementEvidenceRow[]>;
  abstract findByWorkflowId(
    workflowId: string,
  ): Promise<RequirementEvidenceRow[]>;
}

export const REQUIREMENT_EVIDENCE_REPOSITORY = Symbol(
  'REQUIREMENT_EVIDENCE_REPOSITORY',
);
