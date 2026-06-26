import {
  buildBitrixMultipleFileFieldUpdate,
  parseExistingBitrixFileIds,
} from '../../domains/bitrix/services/bitrix-deal-file-field.builder';

describe('bitrix-deal-file-field.builder', () => {
  it('parses numeric file ids from arrays and objects', () => {
    expect(parseExistingBitrixFileIds([30577, { id: 30581 }])).toEqual([
      30577, 30581,
    ]);
    expect(parseExistingBitrixFileIds({ '30577': 30577 })).toEqual([30577]);
  });

  it('keeps existing files and appends new base64 uploads', () => {
    const payload = buildBitrixMultipleFileFieldUpdate(
      [30577],
      [{ filename: 'floor.jpg', contentBase64: 'abc123' }],
    );

    expect(payload).toEqual({
      '30577': 30577,
      n0: ['floor.jpg', 'abc123'],
    });
  });
});
