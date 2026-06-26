import * as fs from 'fs';
import * as path from 'path';
import { parseAnalyzeReplyOutput } from '../../domains/langflow/parsers/analyze-reply.parser';

describe('langflow analyze-reply regression fixtures', () => {
  const fixturePath = path.join(
    __dirname,
    '../../../scripts/fixtures/langflow-analyze-reply-samples.json',
  );
  const samples = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as Array<{
    name: string;
    raw: Record<string, unknown>;
  }>;

  it.each(samples)('parses fixture $name', ({ raw }) => {
    const parsed = parseAnalyzeReplyOutput({ flowName: 'analyze', raw });
    expect(parsed.proposedNextAction).toBeDefined();
    expect(typeof parsed.unsafe).toBe('boolean');
  });
});
