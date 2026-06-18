import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import {
  parseRawRow,
  parseWorkbookBuffer,
} from '../../domains/template-import/parsers/excel-row.parser';

describe('excel-row.parser', () => {
  const fixturePath = path.join(
    __dirname,
    '../fixtures/evamats-sanitized-rows.json',
  );
  const fixtureRows = JSON.parse(
    fs.readFileSync(fixturePath, 'utf-8'),
  ) as Record<string, unknown>[];

  it('parses a valid row and preserves raw_row_json', () => {
    const result = parseRawRow(fixtureRows[0]);

    expect(result.rejected).toBe(false);
    expect(result.row).toEqual({
      brand: 'BMW',
      model: 'X5',
      bodyType: 'SUV',
      generation: 'G05',
      aliases: ['bmw x5 suv'],
      alternateBodyTypes: [],
      notes: [
        {
          product: 'EVA Mat',
          bodyType: 'SUV',
          noteText: 'Confirm trunk dimensions',
          sourceField: 'trunk_note',
        },
      ],
      rawRowJson: fixtureRows[0],
    });
  });

  it('rejects rows missing required fields', () => {
    const result = parseRawRow(fixtureRows[2]);

    expect(result.rejected).toBe(true);
    expect(result.reason).toBe('missing_required_fields');
  });

  it('parses workbook buffer with rejected count', () => {
    const worksheet = XLSX.utils.json_to_sheet(fixtureRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'EVAMATS');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const { rows, rejectedCount } = parseWorkbookBuffer(buffer as Buffer);

    expect(rows).toHaveLength(2);
    expect(rejectedCount).toBe(1);
    expect(rows[0].brand).toBe('BMW');
    expect(rows[1].brand).toBe('Audi');
  });
});
