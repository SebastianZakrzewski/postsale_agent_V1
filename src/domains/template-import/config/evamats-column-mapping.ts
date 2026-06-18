/**
 * OD-006 placeholder column mapping for EVAMATS export.
 * Update when Human Architect provides the real EVAMATS sample file.
 */
export interface EvamatsColumnMapping {
  brand: string;
  model: string;
  bodyType: string;
  generation: string;
  aliases: string;
  noteProduct: string;
  noteBodyType: string;
  noteText: string;
  noteSourceField: string;
}

export const DEFAULT_EVAMATS_COLUMN_MAPPING: EvamatsColumnMapping = {
  brand: 'Brand',
  model: 'Model',
  bodyType: 'Body Type',
  generation: 'Generation',
  aliases: 'Aliases',
  noteProduct: 'Product',
  noteBodyType: 'Note Body Type',
  noteText: 'Note Text',
  noteSourceField: 'Source Field',
};
