/**
 * Parses `--file=path` or `--file path` from CLI argv.
 */
export function parseFileArg(argv: string[]): string | undefined {
  const eqArg = argv.find((arg) => arg.startsWith('--file='));
  if (eqArg) {
    return eqArg.slice('--file='.length);
  }

  const fileIndex = argv.findIndex((arg) => arg === '--file');
  if (fileIndex !== -1 && argv[fileIndex + 1]) {
    return argv[fileIndex + 1];
  }

  return undefined;
}
