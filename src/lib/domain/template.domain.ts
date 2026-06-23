import { TemplateMatchStatus } from '../enums';

export interface TemplateMatchResult {
  status: TemplateMatchStatus;
  escalationReason?: string;
}
