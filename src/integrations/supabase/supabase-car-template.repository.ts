import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  CarTemplateRepository,
  InsertCarTemplateInput,
  InsertCarTemplateNoteInput,
} from '../../domains/template-matching/repository/car-template.repository';
import { CarTemplateNoteRow, CarTemplateRow } from '../../lib/persistence';
import { SUPABASE_CLIENT } from './supabase.tokens';

@Injectable()
export class SupabaseCarTemplateRepository extends CarTemplateRepository {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient,
  ) {
    super();
  }

  async findByNormalizedKey(
    brand: string,
    model: string,
    bodyType: string,
    generation: string | null,
  ): Promise<CarTemplateRow[]> {
    let query = this.client
      .from('car_templates')
      .select('*')
      .eq('brand', brand)
      .eq('model', model)
      .eq('body_type', bodyType);

    if (generation == null) {
      query = query.is('generation', null);
    } else {
      query = query.eq('generation', generation);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to find car templates by key: ${error.message}`);
    }

    return (data ?? []) as CarTemplateRow[];
  }

  async findByAlias(normalizedAlias: string): Promise<CarTemplateRow[]> {
    const { data, error } = await this.client
      .from('car_templates')
      .select('*')
      .contains('aliases', [normalizedAlias]);

    if (error) {
      throw new Error(
        `Failed to find car templates by alias: ${error.message}`,
      );
    }

    return (data ?? []) as CarTemplateRow[];
  }

  async insertTemplate(input: InsertCarTemplateInput): Promise<CarTemplateRow> {
    const { data, error } = await this.client
      .from('car_templates')
      .insert({
        import_batch_id: input.importBatchId,
        brand: input.brand,
        model: input.model,
        body_type: input.bodyType,
        generation: input.generation,
        aliases: input.aliases,
        raw_row_json: input.rawRowJson,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to insert car template: ${error.message}`);
    }

    return data as CarTemplateRow;
  }

  async insertNotes(
    notes: InsertCarTemplateNoteInput[],
  ): Promise<CarTemplateNoteRow[]> {
    if (notes.length === 0) {
      return [];
    }

    const { data, error } = await this.client
      .from('car_template_notes')
      .insert(
        notes.map((note) => ({
          car_template_id: note.carTemplateId,
          product: note.product,
          body_type: note.bodyType,
          note_text: note.noteText,
          source_field: note.sourceField,
        })),
      )
      .select('*');

    if (error) {
      throw new Error(`Failed to insert car template notes: ${error.message}`);
    }

    return (data ?? []) as CarTemplateNoteRow[];
  }

  async findNotesByTemplateId(
    templateId: string,
    product: string,
    bodyType: string,
  ): Promise<CarTemplateNoteRow[]> {
    const { data, error } = await this.client
      .from('car_template_notes')
      .select('*')
      .eq('car_template_id', templateId)
      .eq('product', product)
      .eq('body_type', bodyType);

    if (error) {
      throw new Error(`Failed to find car template notes: ${error.message}`);
    }

    return (data ?? []) as CarTemplateNoteRow[];
  }
}
