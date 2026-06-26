import {
  parseContactPrimaryEmail,
  readBitrixContactId,
} from '../../domains/bitrix/parsers/bitrix-contact-email.parser';

describe('bitrix contact email parser', () => {
  it('reads CONTACT_ID from deal fields', () => {
    expect(readBitrixContactId({ CONTACT_ID: '42' })).toBe('42');
    expect(readBitrixContactId({ CONTACT_ID: '' })).toBeNull();
    expect(readBitrixContactId(undefined)).toBeNull();
  });

  it('parses first non-empty Bitrix EMAIL entry', () => {
    const email = parseContactPrimaryEmail({
      EMAIL: [
        { VALUE_TYPE: 'WORK', VALUE: '  client@example.com  ' },
        { VALUE_TYPE: 'HOME', VALUE: 'other@example.com' },
      ],
    });

    expect(email).toBe('client@example.com');
  });

  it('returns null when contact has no email values', () => {
    expect(parseContactPrimaryEmail({ EMAIL: [] })).toBeNull();
    expect(parseContactPrimaryEmail({ EMAIL: [{ VALUE: '   ' }] })).toBeNull();
    expect(parseContactPrimaryEmail(undefined)).toBeNull();
  });
});
