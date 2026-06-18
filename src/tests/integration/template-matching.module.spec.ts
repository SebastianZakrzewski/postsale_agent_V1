import { Test, TestingModule } from '@nestjs/testing';
import { TemplateMatchingModule } from '../../domains/template-matching/template-matching.module';
import { MatchTemplateUseCase } from '../../domains/template-matching/use-cases/match-template.use-case';
import { SelectNotesUseCase } from '../../domains/template-matching/use-cases/select-notes.use-case';
import { CAR_TEMPLATE_REPOSITORY } from '../../domains/template-matching/repository/car-template.repository';
import { TemplateMatchStatus } from '../../lib/enums';
import { InMemoryCarTemplateRepository } from '../helpers/in-memory-template.repositories';

describe('TemplateMatchingModule (integration)', () => {
  let matchUseCase: MatchTemplateUseCase;
  let selectNotesUseCase: SelectNotesUseCase;
  let repository: InMemoryCarTemplateRepository;

  beforeEach(async () => {
    repository = new InMemoryCarTemplateRepository();

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
    ]);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TemplateMatchingModule],
    })
      .overrideProvider(CAR_TEMPLATE_REPOSITORY)
      .useValue(repository)
      .compile();

    matchUseCase = moduleFixture.get(MatchTemplateUseCase);
    selectNotesUseCase = moduleFixture.get(SelectNotesUseCase);
  });

  it('wires MatchTemplateUseCase through module', async () => {
    const result = await matchUseCase.execute({
      brand: 'BMW',
      model: 'X5',
      bodyType: 'SUV',
      generation: 'G05',
    });

    expect(result.status).toBe(TemplateMatchStatus.MATCHED);
    expect(result.carTemplateId).toBe('template-1');
  });

  it('wires SelectNotesUseCase through module', async () => {
    const result = await selectNotesUseCase.execute({
      carTemplateId: 'template-1',
      product: 'EVA Mat',
      bodyType: 'SUV',
    });

    expect(result.notes).toHaveLength(1);
    expect(result.requiresEscalation).toBe(false);
  });
});
