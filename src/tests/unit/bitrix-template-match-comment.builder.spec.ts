import { TemplateMatchStatus } from '../../lib/enums';
import { buildBitrixTemplateMatchEscalationComment } from '../../domains/bitrix/services/bitrix-template-match-comment.builder';

describe('buildBitrixTemplateMatchEscalationComment', () => {
  it('builds AMBIGUOUS comment', () => {
    const comment = buildBitrixTemplateMatchEscalationComment({
      templateMatchStatus: TemplateMatchStatus.AMBIGUOUS,
      reason: 'multiple_templates',
    });

    expect(comment).toContain('AMBIGUOUS');
    expect(comment).toContain('multiple_templates');
  });
});
