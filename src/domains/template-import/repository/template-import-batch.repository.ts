import { TemplateImportBatchRow } from '../../../lib/persistence';

export abstract class TemplateImportBatchRepository {
  abstract create(
    batch: Omit<TemplateImportBatchRow, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<TemplateImportBatchRow>;
  abstract findById(id: string): Promise<TemplateImportBatchRow | null>;
}

export const TEMPLATE_IMPORT_BATCH_REPOSITORY = Symbol(
  'TEMPLATE_IMPORT_BATCH_REPOSITORY',
);
