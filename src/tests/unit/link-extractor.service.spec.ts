import { extractUrlsFromEmailBody } from '../../domains/email/services/link-extractor.service';

describe('link-extractor.service', () => {
  it('extracts multiple unique links from body', () => {
    const urls = extractUrlsFromEmailBody(
      'See https://example.com/a and http://test.org/b.',
    );
    expect(urls).toEqual(['https://example.com/a', 'http://test.org/b']);
  });
});
