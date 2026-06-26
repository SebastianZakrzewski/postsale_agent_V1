import {
  areBodyTypesCompatible,
  resolveBodyTypeProfile,
  templateRowMatchesBodyType,
} from '../../domains/template-matching/config/body-type-compatibility';

describe('body-type-compatibility', () => {
  it('matches generic template SUV to deal suv_5_seater', () => {
    const deal = resolveBodyTypeProfile('suv_5_seater');
    expect(areBodyTypesCompatible(deal, 'suv')).toBe(true);
  });

  it('does not match template suv to deal suv_7_seater', () => {
    const deal = resolveBodyTypeProfile('suv_7_seater');
    expect(areBodyTypesCompatible(deal, 'suv')).toBe(false);
  });

  it('does not match deal generic suv to template suv_7_seater', () => {
    const deal = resolveBodyTypeProfile('suv');
    expect(areBodyTypesCompatible(deal, 'suv_7_seater')).toBe(false);
  });

  it('matches suv_7_seater exactly', () => {
    const deal = resolveBodyTypeProfile('suv_7_seater');
    expect(areBodyTypesCompatible(deal, 'suv_7_seater')).toBe(true);
  });

  it('matches minivan 5-seat variants', () => {
    const deal = resolveBodyTypeProfile('minivan_5_seater');
    expect(areBodyTypesCompatible(deal, 'minivan')).toBe(true);
  });

  it('does not mix minivan 5 and 7 seat counts', () => {
    const deal5 = resolveBodyTypeProfile('minivan_5_seater');
    const deal7 = resolveBodyTypeProfile('minivan_7_seater');
    expect(areBodyTypesCompatible(deal5, 'minivan_7_seater')).toBe(false);
    expect(areBodyTypesCompatible(deal7, 'minivan')).toBe(false);
  });

  it('matches when any body_type column is compatible', () => {
    const deal = resolveBodyTypeProfile('suv_7_seater');
    expect(
      templateRowMatchesBodyType(deal, {
        body_type_1: 'sedan',
        body_type_2: 'suv_7_seater',
        body_type_3: null,
      }),
    ).toBe(true);
  });

  it('normalizes van dostawczak to van and matches legacy import slug', () => {
    const deal = resolveBodyTypeProfile('van');
    expect(areBodyTypesCompatible(deal, 'van_dseaterawczak')).toBe(true);
    expect(areBodyTypesCompatible(deal, 'minivan')).toBe(false);
  });
});
