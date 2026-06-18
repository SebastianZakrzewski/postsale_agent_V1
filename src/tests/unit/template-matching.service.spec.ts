import { TemplateMatchingService } from '../../domains/template-matching/services/template-matching.service';
import { TemplateNormalizationService } from '../../domains/template-import/services/template-normalization.service';
import { TemplateMatchStatus } from '../../lib/enums';
import { InMemoryCarTemplateRepository } from '../helpers/in-memory-template.repositories';

describe('TemplateMatchingService', () => {
  let repository: InMemoryCarTemplateRepository;
  let service: TemplateMatchingService;

  beforeEach(async () => {
    repository = new InMemoryCarTemplateRepository();
    service = new TemplateMatchingService(
      repository,
      new TemplateNormalizationService(),
    );

    await repository.insertTemplate({
      importBatchId: 'batch-1',
      brand: 'bmw',
      model: 'x5',
      bodyType: 'suv',
      generation: 'g05',
      aliases: ['bmw|x5|suv|special'],
      rawRowJson: {},
    });

    await repository.insertTemplate({
      importBatchId: 'batch-1',
      brand: 'audi',
      model: 'a4',
      bodyType: 'sedan',
      generation: 'b9',
      aliases: [],
      rawRowJson: {},
    });

    await repository.insertTemplate({
      importBatchId: 'batch-1',
      brand: 'bmw',
      model: 'x5',
      bodyType: 'suv',
      generation: null,
      aliases: [],
      rawRowJson: {},
    });

    await repository.insertTemplate({
      importBatchId: 'batch-1',
      brand: 'bmw',
      model: 'x5',
      bodyType: 'suv',
      generation: null,
      aliases: [],
      rawRowJson: {},
    });
  });

  it('returns MATCHED on exact match', async () => {
    const result = await service.match({
      brand: 'BMW',
      model: 'X5',
      bodyType: 'SUV',
      generation: 'G05',
    });

    expect(result.status).toBe(TemplateMatchStatus.MATCHED);
    expect(result.carTemplateId).toBe('template-1');
  });

  it('returns MATCHED via alias when exact match fails', async () => {
    const result = await service.match({
      brand: 'BMW',
      model: 'X5',
      bodyType: 'SUV',
      generation: 'special',
    });

    expect(result.status).toBe(TemplateMatchStatus.MATCHED);
    expect(result.carTemplateId).toBe('template-1');
  });

  it('prefers exact match before alias when both could match', async () => {
    const exactFirstRepository = new InMemoryCarTemplateRepository();
    const exactFirstService = new TemplateMatchingService(
      exactFirstRepository,
      new TemplateNormalizationService(),
    );

    await exactFirstRepository.insertTemplate({
      importBatchId: 'batch-1',
      brand: 'bmw',
      model: 'x5',
      bodyType: 'suv',
      generation: 'g05',
      aliases: [],
      rawRowJson: {},
    });

    await exactFirstRepository.insertTemplate({
      importBatchId: 'batch-1',
      brand: 'audi',
      model: 'a4',
      bodyType: 'sedan',
      generation: 'b9',
      aliases: ['bmw|x5|suv|g05'],
      rawRowJson: {},
    });

    const result = await exactFirstService.match({
      brand: 'BMW',
      model: 'X5',
      bodyType: 'SUV',
      generation: 'G05',
    });

    expect(result.status).toBe(TemplateMatchStatus.MATCHED);
    expect(result.carTemplateId).toBe('template-1');
  });

  it('returns NOT_FOUND when no template matches (baseline case 2)', async () => {
    const result = await service.match({
      brand: 'Toyota',
      model: 'Corolla',
      bodyType: 'Sedan',
      generation: null,
    });

    expect(result.status).toBe(TemplateMatchStatus.NOT_FOUND);
    expect(result.carTemplateId).toBeUndefined();
    expect(result.escalationReason).toBe('template_not_found');
  });

  it('returns AMBIGUOUS when multiple exact matches (baseline case 3)', async () => {
    const result = await service.match({
      brand: 'BMW',
      model: 'X5',
      bodyType: 'SUV',
      generation: null,
    });

    expect(result.status).toBe(TemplateMatchStatus.AMBIGUOUS);
    expect(result.carTemplateId).toBeUndefined();
    expect(result.matchedTemplates).toHaveLength(2);
    expect(result.escalationReason).toBe('ambiguous_template');
  });
});
