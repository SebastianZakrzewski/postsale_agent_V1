import { RequirementLabel } from '../enums';

export interface ClassifiedRequirementDraft {
  sourceField: string;
  sourceNote: string;
  requirementLabel: RequirementLabel;
  questionText: string;
  classificationReason: string;
  confidence: number;
}
