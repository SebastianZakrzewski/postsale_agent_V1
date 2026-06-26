export function isOptionSelectionHeuristicEnabled(): boolean {
  const value =
    process.env.FEATURE_OPTION_SELECTION_HEURISTIC?.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}
