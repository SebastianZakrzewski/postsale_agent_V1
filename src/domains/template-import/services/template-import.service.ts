import { Inject, Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { ImportTemplateBatchCommand } from '../../../lib/commands/template.commands';
import { ImportBatchResult } from '../../../lib/domain';
import { structuredLogFields } from '../../../lib/observability/structured-log-fields';
import { parseWorkbookFile } from '../parsers/excel-row.parser';
import {
  CAR_TEMPLATE_REPOSITORY,
  CarTemplateRepository,
} from '../../template-matching/repository/car-template.repository';
import {
  TEMPLATE_IMPORT_BATCH_REPOSITORY,
  TemplateImportBatchRepository,
} from '../repository/template-import-batch.repository';
import { TemplateNormalizationService } from './template-normalization.service';

@Injectable()
export class TemplateImportService {
  private readonly logger = new Logger(TemplateImportService.name);

  constructor(
    @Inject(TEMPLATE_IMPORT_BATCH_REPOSITORY)
    private readonly batchRepository: TemplateImportBatchRepository,
    @Inject(CAR_TEMPLATE_REPOSITORY)
    private readonly carTemplateRepository: CarTemplateRepository,
    private readonly normalizationService: TemplateNormalizationService,
  ) {}

  async importBatch(
    command: ImportTemplateBatchCommand,
  ): Promise<ImportBatchResult> {
    const sourceFilename =
      command.sourceFilename ?? path.basename(command.filePath);

    const { rows, rejectedCount } = parseWorkbookFile(command.filePath);

    const batch = await this.batchRepository.create({
      source_filename: sourceFilename,
      row_count: 0,
      error_count: rejectedCount,
      status: 'pending',
    });

    let importedCount = 0;

    try {
      for (const row of rows) {
        const normalized = this.normalizationService.normalizeVehicleFields({
          brand: row.brand,
          model: row.model,
          bodyType: row.bodyType,
          generation: row.generation,
        });

        if (!this.normalizationService.hasRequiredVehicleFields(normalized)) {
          this.logger.warn(
            structuredLogFields('template_import.row_rejected', {
              batch_id: batch.id,
              reason: 'missing_required_fields_after_normalize',
            }),
          );
          continue;
        }

        const aliases = this.buildTemplateAliases(row, normalized);

        const template = await this.carTemplateRepository.insertTemplate({
          importBatchId: batch.id,
          brand: normalized.brand,
          model: normalized.model,
          bodyType: normalized.bodyType,
          generation: normalized.generation,
          aliases,
          rawRowJson: row.rawRowJson,
        });

        if (row.notes.length > 0) {
          await this.carTemplateRepository.insertNotes(
            row.notes.map((note) => ({
              carTemplateId: template.id,
              product: this.normalizationService.normalizeProduct(note.product),
              bodyType: this.normalizationService.normalizeBodyType(
                note.bodyType,
              ),
              noteText: note.noteText.trim(),
              sourceField: this.normalizationService.normalizeSourceField(
                note.sourceField,
              ),
            })),
          );
        }

        importedCount += 1;
      }

      const totalRejected = rejectedCount + (rows.length - importedCount);
      const status = importedCount > 0 ? 'completed' : 'failed';

      const updated = await this.batchRepository.update(batch.id, {
        row_count: importedCount,
        error_count: totalRejected,
        status,
      });

      if (status === 'completed') {
        this.logger.log(
          structuredLogFields('template_import.batch_completed', {
            batch_id: batch.id,
            row_count: String(importedCount),
            error_count: String(totalRejected),
            status,
          }),
        );
      } else {
        this.logger.warn(
          structuredLogFields('template_import.batch_failed', {
            batch_id: batch.id,
            row_count: String(importedCount),
            error_count: String(totalRejected),
            status,
            reason: 'zero_templates_imported',
          }),
        );
      }

      return {
        batchId: updated.id,
        rowCount: updated.row_count,
        errorCount: updated.error_count,
        status: updated.status,
      };
    } catch (error) {
      const totalRejected = rejectedCount + (rows.length - importedCount);

      try {
        await this.batchRepository.update(batch.id, {
          row_count: importedCount,
          error_count: totalRejected,
          status: 'failed',
        });
      } catch (updateError) {
        this.logger.error(
          structuredLogFields('template_import.batch_failed', {
            batch_id: batch.id,
            reason: 'batch_status_update_failed',
            error:
              updateError instanceof Error
                ? updateError.message
                : String(updateError),
          }),
        );
      }

      this.logger.error(
        structuredLogFields('template_import.batch_failed', {
          batch_id: batch.id,
          row_count: String(importedCount),
          error_count: String(totalRejected),
          status: 'failed',
          reason: 'import_error',
          error: error instanceof Error ? error.message : String(error),
        }),
      );

      throw error;
    }
  }

  private buildTemplateAliases(
    row: {
      aliases: string[];
      alternateBodyTypes: string[];
    },
    normalized: {
      brand: string;
      model: string;
      bodyType: string;
      generation: string | null;
    },
  ): string[] {
    const aliasSet = new Set<string>(
      this.normalizationService.normalizeAliases(row.aliases),
    );

    for (const alternateBodyType of row.alternateBodyTypes) {
      aliasSet.add(
        this.normalizationService.buildMatchKey(
          normalized.brand,
          normalized.model,
          alternateBodyType,
          normalized.generation,
        ),
      );
    }

    return [...aliasSet];
  }
}
