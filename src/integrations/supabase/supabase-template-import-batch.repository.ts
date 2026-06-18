import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  TemplateImportBatchRepository,
  TemplateImportBatchUpdate,
} from '../../domains/template-import/repository/template-import-batch.repository';
import { TemplateImportBatchRow } from '../../lib/persistence';
import { SUPABASE_CLIENT } from './supabase.tokens';

@Injectable()
export class SupabaseTemplateImportBatchRepository extends TemplateImportBatchRepository {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient,
  ) {
    super();
  }

  async create(
    batch: Omit<TemplateImportBatchRow, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<TemplateImportBatchRow> {
    const { data, error } = await this.client
      .from('template_import_batches')
      .insert(batch)
      .select('*')
      .single();

    if (error) {
      throw new Error(
        `Failed to create template import batch: ${error.message}`,
      );
    }

    return data as TemplateImportBatchRow;
  }

  async findById(id: string): Promise<TemplateImportBatchRow | null> {
    const { data, error } = await this.client
      .from('template_import_batches')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find template import batch: ${error.message}`);
    }

    return data as TemplateImportBatchRow | null;
  }

  async update(
    id: string,
    update: TemplateImportBatchUpdate,
  ): Promise<TemplateImportBatchRow> {
    const { data, error } = await this.client
      .from('template_import_batches')
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(
        `Failed to update template import batch: ${error.message}`,
      );
    }

    return data as TemplateImportBatchRow;
  }
}
