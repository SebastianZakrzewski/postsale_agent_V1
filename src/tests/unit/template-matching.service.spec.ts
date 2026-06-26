import { Test, TestingModule } from '@nestjs/testing';
import { TemplateMatchingService } from '../../domains/template-matching/services/template-matching.service';
import { CarTemplateRepository } from '../../domains/template-matching/repository/car-template.repository.port';
import {
  buildAcuraMdxTemplate,
  InMemoryCarTemplateRepository,
} from '../helpers/in-memory-car-template.repository';

describe('TemplateMatchingService', () => {
  let service: TemplateMatchingService;
  let repository: InMemoryCarTemplateRepository;

  beforeEach(async () => {
    repository = new InMemoryCarTemplateRepository();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateMatchingService,
        {
          provide: CarTemplateRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = moduleFixture.get(TemplateMatchingService);
  });

  it('escalates when generation is missing', async () => {
    const result = await service.matchDealContext({
      bitrixDealId: '1',
      brand: 'Acura',
      model: 'MDX',
      bodyType: 'SUV 7 osobowy',
      generation: null,
      product: '3D EVAPREMIUM Z RANTAMI',
    });

    expect(result.status).toBe('NOT_FOUND');
    if (result.status === 'NOT_FOUND') {
      expect(result.escalationReason).toBe('missing_generation');
    }
  });

  it('escalates ambiguous templates', async () => {
    repository.seed(
      buildAcuraMdxTemplate({ id: 'a' }),
      buildAcuraMdxTemplate({ id: 'b' }),
    );

    const result = await service.matchDealContext({
      bitrixDealId: '1',
      brand: 'Acura',
      model: 'MDX 2 gen',
      bodyType: 'SUV 7 osobowy',
      generation: '2006-2013',
      product: '3D EVAPREMIUM Z RANTAMI',
    });

    expect(result.status).toBe('AMBIGUOUS');
  });

  it('matches Acura MDX suv_7_seater', async () => {
    repository.seed(buildAcuraMdxTemplate());

    const result = await service.matchDealContext({
      bitrixDealId: '1',
      brand: 'Acura',
      model: 'MDX 2 gen',
      bodyType: 'SUV 7 osobowy',
      generation: '2006-2013',
      product: '3D EVAPREMIUM Z RANTAMI',
    });

    expect(result.status).toBe('MATCHED');
    if (result.status === 'MATCHED') {
      expect(result.carTemplate.id).toBe('template-acura-mdx');
      expect(result.resolvedBodyProfile.canonical).toBe('suv_7_seater');
    }
  });
});
