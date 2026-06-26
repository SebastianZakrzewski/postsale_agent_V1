export function resolveBitrixStageCompleted(): string {
  return process.env.BITRIX_STAGE_COMPLETED?.trim() || 'UC_ZQ68O2';
}

export function resolveBitrixStageEscalated(): string {
  return process.env.BITRIX_STAGE_ESCALATED?.trim() || 'PREPARATION';
}
