import {
  CarTemplateRow,
  CarTemplateNoteRow,
  TemplateImportBatchRow,
} from '../../lib/persistence';
import {
  CarTemplateRepository,
  InsertCarTemplateInput,
  InsertCarTemplateNoteInput,
} from '../../domains/template-matching/repository/car-template.repository';
import {
  TemplateImportBatchRepository,
  TemplateImportBatchUpdate,
} from '../../domains/template-import/repository/template-import-batch.repository';

export class InMemoryTemplateImportBatchRepository extends TemplateImportBatchRepository {
  private readonly batches = new Map<string, TemplateImportBatchRow>();

  async create(
    batch: Omit<TemplateImportBatchRow, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<TemplateImportBatchRow> {
    const id = `batch-${this.batches.size + 1}`;
    const row: TemplateImportBatchRow = {
      id,
      ...batch,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.batches.set(id, row);
    return row;
  }

  async findById(id: string): Promise<TemplateImportBatchRow | null> {
    return this.batches.get(id) ?? null;
  }

  async update(
    id: string,
    update: TemplateImportBatchUpdate,
  ): Promise<TemplateImportBatchRow> {
    const existing = this.batches.get(id);
    if (!existing) {
      throw new Error(`Batch not found: ${id}`);
    }
    const updated: TemplateImportBatchRow = {
      ...existing,
      ...update,
      updated_at: new Date().toISOString(),
    };
    this.batches.set(id, updated);
    return updated;
  }
}

export class InMemoryCarTemplateRepository extends CarTemplateRepository {
  private readonly templates: CarTemplateRow[] = [];
  private readonly notes: CarTemplateNoteRow[] = [];

  async findByNormalizedKey(
    brand: string,
    model: string,
    bodyType: string,
    generation: string | null,
  ): Promise<CarTemplateRow[]> {
    return this.templates.filter(
      (template) =>
        template.brand === brand &&
        template.model === model &&
        template.body_type === bodyType &&
        template.generation === generation,
    );
  }

  async findByAlias(normalizedAlias: string): Promise<CarTemplateRow[]> {
    return this.templates.filter((template) =>
      (template.aliases ?? []).includes(normalizedAlias),
    );
  }

  async insertTemplate(input: InsertCarTemplateInput): Promise<CarTemplateRow> {
    const row: CarTemplateRow = {
      id: `template-${this.templates.length + 1}`,
      import_batch_id: input.importBatchId,
      brand: input.brand,
      model: input.model,
      body_type: input.bodyType,
      generation: input.generation,
      aliases: input.aliases,
      raw_row_json: input.rawRowJson,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.templates.push(row);
    return row;
  }

  async insertNotes(
    noteInputs: InsertCarTemplateNoteInput[],
  ): Promise<CarTemplateNoteRow[]> {
    const inserted = noteInputs.map((note, index) => {
      const row: CarTemplateNoteRow = {
        id: `note-${this.notes.length + index + 1}`,
        car_template_id: note.carTemplateId,
        product: note.product,
        body_type: note.bodyType,
        note_text: note.noteText,
        source_field: note.sourceField,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.notes.push(row);
      return row;
    });
    return inserted;
  }

  async findNotesByTemplateId(
    templateId: string,
    product: string,
    bodyType: string,
  ): Promise<CarTemplateNoteRow[]> {
    return this.notes.filter(
      (note) =>
        note.car_template_id === templateId &&
        note.product === product &&
        note.body_type === bodyType,
    );
  }

  getTemplates(): CarTemplateRow[] {
    return [...this.templates];
  }

  getNotes(): CarTemplateNoteRow[] {
    return [...this.notes];
  }
}
