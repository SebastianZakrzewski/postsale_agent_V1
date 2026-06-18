/**
 * EVAMATS slug mappings (OD-006).
 * Normalized persistence identifiers: English slugs, no whitespace.
 */

/** Exact body-type labels from EVAMATS → English slug. */
export const EVAMATS_BODY_TYPE_SLUGS: Readonly<Record<string, string>> = {
  suv: 'suv',
  'suv ': 'suv',
  'suv 5 drzwi': 'suv_5_door',
  'suv 5 drzwi ': 'suv_5_door',
  'suv 6 osobowy': 'suv_6_seater',
  'suv 7 osobowy': 'suv_7_seater',
  'suv coupe': 'suv_coupe',
  sedan: 'sedan',
  'sedan ': 'sedan',
  kombi: 'wagon',
  hatchback: 'hatchback',
  'hatchback 3 drzwi': 'hatchback_3_door',
  'hatchback 5 drzwi': 'hatchback_5_door',
  'hatchback 5 drzwi ': 'hatchback_5_door',
  'hatchback 3 drzwi ': 'hatchback_3_door',
  coupe: 'coupe',
  'coupe-cabrio': 'coupe_cabrio',
  cabrio: 'convertible',
  kabriolet: 'convertible',
  roadster: 'roadster',
  liftback: 'liftback',
  'liftback ': 'liftback',
  minivan: 'minivan',
  'shooting brake': 'shooting_brake',
  koparka: 'excavator',
  ciagnik: 'tractor',
  ciągnik: 'tractor',
  ladowarka: 'loader',
  ładowarka: 'loader',
  'suv 5os': 'suv_5_seater',
  'suv 7os': 'suv_7_seater',
  'minivan 5os': 'minivan_5_seater',
  'minivan 7os': 'minivan_7_seater',
};

/** Note product labels → English slug. */
export const EVAMATS_PRODUCT_SLUGS: Readonly<Record<string, string>> = {
  'eva mat': 'eva_mat',
  ogolne: 'general',
  ogólne: 'general',
  'przod klasyczny': 'front_classic',
  'przód klasyczny': 'front_classic',
  'przod 3d': 'front_3d',
  'przód 3d': 'front_3d',
  'tyl klasyczny': 'rear_classic',
  'tył klasyczny': 'rear_classic',
  'tyl 3d': 'rear_3d',
  'tył 3d': 'rear_3d',
  '3 rzedu': 'third_row',
  '3 rzędy': 'third_row',
  'bagaznik ogolne': 'trunk_general',
  'bagażnik ogólne': 'trunk_general',
  bagaznik: 'trunk',
  bagażnik: 'trunk',
};

/** Polish tokens replaced before generic slugify (longest first). */
export const POLISH_TO_ENGLISH_TOKENS: Readonly<[string, string][]> = [
  ['osobowy', 'seater'],
  ['osobowe', 'seater'],
  ['drzwi', 'door'],
  ['rzędy', 'row'],
  ['rzedu', 'row'],
  ['rząd', 'row'],
  ['kabriolet', 'convertible'],
  ['kombi', 'wagon'],
  ['sedan', 'sedan'],
  ['minivan', 'minivan'],
  ['hatchback', 'hatchback'],
  ['liftback', 'liftback'],
  ['coupe', 'coupe'],
  ['coupe-cabrio', 'coupe_cabrio'],
  ['roadster', 'roadster'],
  ['generacja', 'generation'],
  ['gen', 'gen'],
  ['polift', 'facelift'],
  ['przedlift', 'prefacelift'],
  ['os.', 'seater'],
  ['os', 'seater'],
];

export const EVAMATS_NOTE_COLUMN_SLUGS: Readonly<
  Record<string, { product: string; bodyType?: string; sourceField: string }>
> = {
  'UWAGI OGÓLNE': {
    product: 'general',
    sourceField: 'notes_general',
  },
  'UWAGI PRZÓD KLASYCZNY': {
    product: 'front_classic',
    sourceField: 'notes_front_classic',
  },
  'UWAGI PRZÓD 3D': {
    product: 'front_3d',
    sourceField: 'notes_front_3d',
  },
  'UWAGI TYŁ KLASYCZNY': {
    product: 'rear_classic',
    sourceField: 'notes_rear_classic',
  },
  'UWAGI TYŁ 3D': {
    product: 'rear_3d',
    sourceField: 'notes_rear_3d',
  },
  'UWAGI 3 rzędy': {
    product: 'third_row',
    sourceField: 'notes_third_row',
  },
  'UWAGI OGÓLNE BAGAŻNIK': {
    product: 'trunk_general',
    sourceField: 'notes_trunk_general',
  },
  'Uwagi bagażnik Kombi': {
    product: 'trunk',
    bodyType: 'wagon',
    sourceField: 'notes_trunk_wagon',
  },
  'Uwagi bagażnik Hatchback': {
    product: 'trunk',
    bodyType: 'hatchback',
    sourceField: 'notes_trunk_hatchback',
  },
  'Uwagi bagażnik Sedan': {
    product: 'trunk',
    bodyType: 'sedan',
    sourceField: 'notes_trunk_sedan',
  },
  'Uwagi bagażnik Liftback': {
    product: 'trunk',
    bodyType: 'liftback',
    sourceField: 'notes_trunk_liftback',
  },
  'Uwagi bagażnik SUV 5os': {
    product: 'trunk',
    bodyType: 'suv_5_seater',
    sourceField: 'notes_trunk_suv_5_seater',
  },
  'Uwagi bagażnik SUV 7os': {
    product: 'trunk',
    bodyType: 'suv_7_seater',
    sourceField: 'notes_trunk_suv_7_seater',
  },
  'Uwagi bagażnik Minivan 5os': {
    product: 'trunk',
    bodyType: 'minivan_5_seater',
    sourceField: 'notes_trunk_minivan_5_seater',
  },
  'Uwagi bagażnik Minivan 7os': {
    product: 'trunk',
    bodyType: 'minivan_7_seater',
    sourceField: 'notes_trunk_minivan_7_seater',
  },
};

export const EVAMATS_SHEET_NAME = 'Nowa baza szablonów';

export const EVAMATS_VEHICLE_COLUMNS = {
  brand: 'MARKA',
  model: 'MODEL',
  generation: 'GENERACJA AUTA',
  bodyType1: 'Typ nadwozia1',
  bodyType2: 'Typ nadwozia2',
  bodyType3: 'Typ nadwozia3',
  aliases: 'INNE NAZWY AUT',
} as const;
