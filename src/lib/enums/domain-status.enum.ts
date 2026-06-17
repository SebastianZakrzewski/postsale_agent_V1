export enum TemplateMatchStatus {
  MATCHED = 'MATCHED',
  NOT_FOUND = 'NOT_FOUND',
  AMBIGUOUS = 'AMBIGUOUS',
}

export enum RequirementStatus {
  PENDING = 'PENDING',
  VALID = 'VALID',
  PARTIAL = 'PARTIAL',
  UNCLEAR = 'UNCLEAR',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export enum SideEffectRecordStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

export enum MessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}
