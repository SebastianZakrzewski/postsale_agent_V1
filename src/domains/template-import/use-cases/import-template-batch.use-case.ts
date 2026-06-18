import { Injectable } from '@nestjs/common';
import { ImportTemplateBatchCommand } from '../../../lib/commands/template.commands';
import { ImportBatchResult } from '../../../lib/domain';
import { TemplateImportService } from '../services/template-import.service';

@Injectable()
export class ImportTemplateBatchUseCase {
  constructor(private readonly templateImportService: TemplateImportService) {}

  execute(command: ImportTemplateBatchCommand): Promise<ImportBatchResult> {
    return this.templateImportService.importBatch(command);
  }
}
