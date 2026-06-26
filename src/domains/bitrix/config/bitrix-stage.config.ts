export function resolveBitrixStageCompleted(): string {
  return process.env.BITRIX_STAGE_COMPLETED?.trim() || 'UC_ZQ68O2';
}

export function resolveBitrixStageEscalated(): string {
  return process.env.BITRIX_STAGE_ESCALATED?.trim() || 'PREPARATION';
}

export function isBitrixCompletionStageUpdateEnabled(): boolean {
  const raw =
    process.env.BITRIX_COMPLETION_STAGE_UPDATE_ENABLED?.trim().toLowerCase();
  if (raw === 'true' || raw === '1' || raw === 'yes') {
    return true;
  }
  return false;
}
