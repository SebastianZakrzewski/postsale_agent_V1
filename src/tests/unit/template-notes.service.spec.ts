import { TemplateNotesService } from '../../domains/template-matching/services/template-notes.service';
import { TemplateNormalizationService } from '../../domains/template-import/services/template-normalization.service';
import { InMemoryCarTemplateRepository } from '../helpers/in-memory-template.repositories';

describe('TemplateNotesService', () => {
  let repository: InMemoryCarTemplateRepository;
  let service: TemplateNotesService;

  beforeEach(async () => {
    repository = new InMemoryCarTemplateRepository();
    service = new TemplateNotesService(
      repository,
      new TemplateNormalizationService(),
    );

    const template = await repository.insertTemplate({
      importBatchId: 'batch-1',
      brand: 'bmw',
      model: 'x5',
      bodyType: 'suv',
      generation: 'g05',
      aliases: [],
      rawRowJson: {},
    });

    await repository.insertNotes([
      {
        carTemplateId: template.id,
        product: 'eva_mat',
        bodyType: 'suv',
        noteText: 'Confirm trunk dimensions',
        sourceField: 'trunk_note',
      },
      {
        carTemplateId: template.id,
        product: 'eva_mat',
        bodyType: 'sedan',
        noteText: 'Wrong body type note',
        sourceField: 'other',
      },
    ]);
  });

  it('filters notes by product and body type', async () => {
    const result = await service.selectNotes({
      carTemplateId: 'template-1',
      product: 'EVA Mat',
      bodyType: 'SUV',
    });

    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].noteText).toBe('Confirm trunk dimensions');
    expect(result.requiresEscalation).toBe(false);
  });

  it('returns escalation signal when no notes match', async () => {
    const result = await service.selectNotes({
      carTemplateId: 'template-1',
      product: 'EVA Mat',
      bodyType: 'Hatchback',
    });

    expect(result.notes).toHaveLength(0);
    expect(result.requiresEscalation).toBe(true);
  });
});
