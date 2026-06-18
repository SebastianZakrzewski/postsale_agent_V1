import { TemplateNormalizationService } from '../../domains/template-import/services/template-normalization.service';

describe('TemplateNormalizationService', () => {
  let service: TemplateNormalizationService;

  beforeEach(() => {
    service = new TemplateNormalizationService();
  });

  it('normalizeField keeps spaced lowercase for legacy comparisons', () => {
    expect(service.normalizeField('  BMW   X5  ')).toBe('bmw x5');
  });

  it('normalizeIdentifier produces english slugs without whitespace', () => {
    expect(service.normalizeIdentifier('  BMW   X5  ')).toBe('bmw_x5');
    expect(service.normalizeIdentifier('MDX 2 gen')).toBe('mdx_2_gen');
    expect(service.normalizeIdentifier('Q7(4L) 1 gen')).toBe('q7_4l_1_gen');
  });

  it('normalizeBodyType maps EVAMATS labels to english slugs', () => {
    expect(service.normalizeBodyType('SUV 7 osobowy')).toBe('suv_7_seater');
    expect(service.normalizeBodyType('SUV 5 drzwi ')).toBe('suv_5_door');
    expect(service.normalizeBodyType('Kombi')).toBe('wagon');
    expect(service.normalizeBodyType('Hatchback 3 drzwi')).toBe(
      'hatchback_3_door',
    );
    expect(service.normalizeBodyType('SUV')).toBe('suv');
  });

  it('normalizeProduct maps known product labels to english slugs', () => {
    expect(service.normalizeProduct('EVA Mat')).toBe('eva_mat');
    expect(service.normalizeProduct('przód 3d')).toBe('front_3d');
    expect(service.normalizeProduct('bagażnik')).toBe('trunk');
  });

  it('normalizeSourceField produces snake_case without whitespace', () => {
    expect(service.normalizeSourceField('trunk note')).toBe('trunk_note');
    expect(service.normalizeSourceField('  ')).toBeNull();
  });

  it('returns null generation when empty', () => {
    expect(service.normalizeGeneration('')).toBeNull();
    expect(service.normalizeGeneration('   ')).toBeNull();
    expect(service.normalizeGeneration('G05')).toBe('g05');
    expect(service.normalizeGeneration('2006-2013')).toBe('2006-2013');
  });

  it('normalizes and deduplicates aliases', () => {
    expect(service.normalizeAliases('BMW X5, bmw x5; SUV')).toEqual([
      'bmw_x5',
      'suv',
    ]);
  });

  it('normalizes pipe-delimited alias match keys', () => {
    expect(service.normalizeAliases(['BMW|X5|SUV|G05'])).toEqual([
      'bmw|x5|suv|g05',
    ]);
  });

  it('builds match key with slugged parts', () => {
    expect(service.buildMatchKey('BMW', 'X5', 'SUV', 'G05')).toBe(
      'bmw|x5|suv|g05',
    );
    expect(
      service.buildMatchKey('Acura', 'MDX 2 gen', 'SUV 7 osobowy', '2006-2013'),
    ).toBe('acura|mdx_2_gen|suv_7_seater|2006-2013');
  });

  it('builds match key without generation', () => {
    expect(service.buildMatchKey('BMW', 'X5', 'SUV', null)).toBe('bmw|x5|suv');
  });

  it('detects missing required vehicle fields', () => {
    expect(
      service.hasRequiredVehicleFields({
        brand: 'BMW',
        model: '',
        bodyType: 'SUV',
      }),
    ).toBe(false);
    expect(
      service.hasRequiredVehicleFields({
        brand: 'BMW',
        model: 'X5',
        bodyType: 'SUV',
      }),
    ).toBe(true);
  });
});
