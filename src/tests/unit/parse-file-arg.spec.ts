import { parseFileArg } from '../../lib/cli/parse-file-arg';

describe('parseFileArg', () => {
  it('parses --file=path form', () => {
    expect(parseFileArg(['--file=./data/evamats.xlsx'])).toBe(
      './data/evamats.xlsx',
    );
  });

  it('parses --file path form', () => {
    expect(parseFileArg(['--file', './data/evamats.xlsx'])).toBe(
      './data/evamats.xlsx',
    );
  });

  it('prefers --file= when both forms could apply', () => {
    expect(parseFileArg(['--file=./eq.xlsx', '--file', './space.xlsx'])).toBe(
      './eq.xlsx',
    );
  });

  it('returns undefined when --file is missing or has no value', () => {
    expect(parseFileArg([])).toBeUndefined();
    expect(parseFileArg(['--file'])).toBeUndefined();
  });
});
