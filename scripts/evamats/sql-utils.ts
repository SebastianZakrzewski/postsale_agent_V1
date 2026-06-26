import { randomUUID } from 'crypto';
import { CAR_TEMPLATE_NOTE_COLUMNS } from './slug-mappings';
import { EvamatsWideTemplateRow } from './wide-types';

export function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function sqlNullableText(value: string | null): string {
  return value == null ? 'NULL' : sqlLiteral(value);
}

export function sqlJson(value: Record<string, unknown>): string {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

export function newBatchId(): string {
  return randomUUID();
}

export function newTemplateId(): string {
  return randomUUID();
}

const INSERT_COLUMNS = [
  'id',
  'import_batch_id',
  'brand',
  'model',
  'generation',
  'body_type_1',
  'body_type_2',
  'body_type_3',
  ...CAR_TEMPLATE_NOTE_COLUMNS,
  'raw_row_json',
] as const;

export function buildTemplateInsertValues(
  templateId: string,
  batchId: string,
  row: EvamatsWideTemplateRow,
): string {
  const values = [
    sqlLiteral(templateId),
    sqlLiteral(batchId),
    sqlLiteral(row.brand),
    sqlLiteral(row.model),
    sqlNullableText(row.generation),
    sqlLiteral(row.body_type_1),
    sqlNullableText(row.body_type_2),
    sqlNullableText(row.body_type_3),
    ...CAR_TEMPLATE_NOTE_COLUMNS.map((column) =>
      sqlNullableText(row.notes[column]),
    ),
    sqlJson(row.raw_row_json),
  ];

  return `(${values.join(', ')})`;
}

export function buildTemplateInsertStatement(
  batchId: string,
  rows: EvamatsWideTemplateRow[],
  templateIds: string[],
): string {
  const values = rows
    .map((row, index) =>
      buildTemplateInsertValues(templateIds[index]!, batchId, row),
    )
    .join(',\n');

  return [
    'INSERT INTO postsale_agent_evapremium.car_templates',
    `(${INSERT_COLUMNS.join(', ')})`,
    `VALUES ${values};`,
  ].join('\n');
}
