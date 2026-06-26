import { normalizeBodyType } from '../../lib/normalization';

describe('van body type normalization', () => {
  it('maps Van dostawczak to van slug', () => {
    expect(normalizeBodyType('Van dostawczak')).toBe('van');
    expect(normalizeBodyType('Van')).toBe('van');
    expect(normalizeBodyType('VAN DOSTAWCZY')).toBe('van');
  });
});
