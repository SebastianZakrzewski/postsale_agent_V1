import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CarTemplateRepository } from '../../domains/template-matching/repository/car-template.repository.port';
import { CarTemplateWideRow } from '../../domains/template-matching/types';
import { CarTemplateRow } from '../../lib/persistence';
import { toCarTemplateWideRow } from '../../lib/persistence/mappers/car-template.mapper';
import { SUPABASE_CLIENT } from './supabase.tokens';

@Injectable()
export class SupabaseCarTemplateRepository extends CarTemplateRepository {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient,
  ) {
    super();
  }

  async findByVehicleKey(
    brand: string,
    model: string,
    generation: string,
  ): Promise<CarTemplateWideRow[]> {
    const { data, error } = await this.client
      .from('car_templates')
      .select('*')
      .eq('brand', brand)
      .eq('model', model)
      .eq('generation', generation);

    if (error) {
      throw new Error(`Failed to find car templates: ${error.message}`);
    }

    return ((data as CarTemplateRow[]) ?? []).map(toCarTemplateWideRow);
  }
}
