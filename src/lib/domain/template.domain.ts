import { TemplateMatchStatus } from '../enums';
import { SelectedTemplateNote } from '../../domains/template-matching/types';

export type { SelectedTemplateNote };

export interface TemplateMatchResult {
  status: TemplateMatchStatus;
  escalationReason?: string;
  carTemplateId?: string;
  selectedNotes?: SelectedTemplateNote[];
}
