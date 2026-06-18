import { Inject, Injectable } from '@nestjs/common';
import { MatchTemplateCommand } from '../../../lib/commands/template.commands';
import { TemplateMatchResult } from '../../../lib/domain';
import { TemplateMatchStatus } from '../../../lib/enums';
import { CarTemplateRow } from '../../../lib/persistence';
import { toCarTemplate } from '../../../lib/persistence/mappers/car-template.mapper';
import { TemplateNormalizationService } from '../../template-import/services/template-normalization.service';
import {
  CAR_TEMPLATE_REPOSITORY,
  CarTemplateRepository,
} from '../repository/car-template.repository';

@Injectable()
export class TemplateMatchingService {
  constructor(
    @Inject(CAR_TEMPLATE_REPOSITORY)
    private readonly carTemplateRepository: CarTemplateRepository,
    private readonly normalizationService: TemplateNormalizationService,
  ) {}

  async match(command: MatchTemplateCommand): Promise<TemplateMatchResult> {
    const normalized = this.normalizationService.normalizeVehicleFields({
      brand: command.brand,
      model: command.model,
      bodyType: command.bodyType,
      generation: command.generation,
    });

    if (!this.normalizationService.hasRequiredVehicleFields(normalized)) {
      return {
        status: TemplateMatchStatus.NOT_FOUND,
        escalationReason: 'insufficient_vehicle_data',
      };
    }

    const exactMatches = await this.carTemplateRepository.findByNormalizedKey(
      normalized.brand,
      normalized.model,
      normalized.bodyType,
      normalized.generation,
    );

    if (exactMatches.length === 1) {
      return {
        status: TemplateMatchStatus.MATCHED,
        carTemplateId: exactMatches[0].id,
        matchedTemplates: [toCarTemplate(exactMatches[0])],
      };
    }

    if (exactMatches.length > 1) {
      return this.ambiguousResult(exactMatches);
    }

    const aliasKey = this.normalizationService.buildMatchKey(
      normalized.brand,
      normalized.model,
      normalized.bodyType,
      normalized.generation,
    );

    const aliasMatches = await this.carTemplateRepository.findByAlias(aliasKey);

    if (aliasMatches.length === 1) {
      return {
        status: TemplateMatchStatus.MATCHED,
        carTemplateId: aliasMatches[0].id,
        matchedTemplates: [toCarTemplate(aliasMatches[0])],
      };
    }

    if (aliasMatches.length > 1) {
      return this.ambiguousResult(aliasMatches);
    }

    return {
      status: TemplateMatchStatus.NOT_FOUND,
      escalationReason: 'template_not_found',
    };
  }

  private ambiguousResult(rows: CarTemplateRow[]): TemplateMatchResult {
    return {
      status: TemplateMatchStatus.AMBIGUOUS,
      matchedTemplates: rows.map(toCarTemplate),
      escalationReason: 'ambiguous_template',
    };
  }
}
