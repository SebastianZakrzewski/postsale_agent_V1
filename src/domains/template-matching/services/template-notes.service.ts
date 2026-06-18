import { Inject, Injectable } from '@nestjs/common';
import { SelectNotesCommand } from '../../../lib/commands/template.commands';
import { TemplateNotesResult } from '../../../lib/domain';
import { toTemplateNote } from '../../../lib/persistence/mappers/car-template.mapper';
import { TemplateNormalizationService } from '../../template-import/services/template-normalization.service';
import {
  CAR_TEMPLATE_REPOSITORY,
  CarTemplateRepository,
} from '../repository/car-template.repository';

@Injectable()
export class TemplateNotesService {
  constructor(
    @Inject(CAR_TEMPLATE_REPOSITORY)
    private readonly carTemplateRepository: CarTemplateRepository,
    private readonly normalizationService: TemplateNormalizationService,
  ) {}

  async selectNotes(command: SelectNotesCommand): Promise<TemplateNotesResult> {
    const product = this.normalizationService.normalizeProduct(command.product);
    const bodyType = this.normalizationService.normalizeBodyType(
      command.bodyType,
    );

    const rows = await this.carTemplateRepository.findNotesByTemplateId(
      command.carTemplateId,
      product,
      bodyType,
    );

    const notes = rows.map(toTemplateNote);

    return {
      notes,
      requiresEscalation: notes.length === 0,
    };
  }
}
