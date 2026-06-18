import { TemplateImportBatchRow } from '../../../lib/persistence';

export type TemplateImportBatchUpdate = Partial<
  Pick<TemplateImportBatchRow, 'row_count' | 'error_count' | 'status'>
>;

export abstract class TemplateImportBatchRepository {
  abstract create(
    batch: Omit<TemplateImportBatchRow, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<TemplateImportBatchRow>;
  abstract findById(id: string): Promise<TemplateImportBatchRow | null>;
  abstract update(
    id: string,
    update: TemplateImportBatchUpdate,
  ): Promise<TemplateImportBatchRow>;
}

export const TEMPLATE_IMPORT_BATCH_REPOSITORY = Symbol(
  'TEMPLATE_IMPORT_BATCH_REPOSITORY',
);
