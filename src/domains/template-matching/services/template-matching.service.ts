import { Injectable } from '@nestjs/common';
import {
  normalizeBodyType,
  normalizeGeneration,
  normalizeIdentifier,
} from '../../../lib/normalization';
import { DealContext } from '../../../lib/domain';
import {
  resolveBodyTypeProfile,
  templateRowMatchesBodyType,
} from '../config/body-type-compatibility';
import { CarTemplateRepository } from '../repository/car-template.repository.port';
import { TemplateMatchStage1Result } from '../types';

@Injectable()
export class TemplateMatchingService {
  constructor(private readonly carTemplateRepository: CarTemplateRepository) {}

  async matchDealContext(
    dealContext: DealContext,
  ): Promise<TemplateMatchStage1Result> {
    const brand = normalizeIdentifier(dealContext.brand);
    const model = normalizeIdentifier(dealContext.model);
    const generation = normalizeGeneration(dealContext.generation);
    const bodyType = normalizeBodyType(dealContext.bodyType);

    if (!brand || !model || !bodyType) {
      return {
        status: 'NOT_FOUND',
        escalationReason: 'insufficient_vehicle_data',
      };
    }

    if (!generation) {
      return {
        status: 'NOT_FOUND',
        escalationReason: 'missing_generation',
      };
    }

    const candidates = await this.carTemplateRepository.findByVehicleKey(
      brand,
      model,
      generation,
    );

    if (candidates.length === 0) {
      return {
        status: 'NOT_FOUND',
        escalationReason: 'template_not_found',
      };
    }

    const dealProfile = resolveBodyTypeProfile(bodyType);
    const bodyMatches = candidates.filter((row) =>
      templateRowMatchesBodyType(dealProfile, row),
    );

    if (bodyMatches.length === 0) {
      return {
        status: 'NOT_FOUND',
        escalationReason: 'body_type_mismatch',
      };
    }

    if (bodyMatches.length > 1) {
      return {
        status: 'AMBIGUOUS',
        escalationReason: 'ambiguous_template',
        candidateIds: bodyMatches.map((row) => row.id),
      };
    }

    return {
      status: 'MATCHED',
      carTemplate: bodyMatches[0]!,
      resolvedBodyProfile: dealProfile,
    };
  }
}
