import { CarTemplateNoteColumn } from '../../lib/normalization';

export type BodyTypeFamily =
  | 'suv'
  | 'minivan'
  | 'van'
  | 'hatchback'
  | 'sedan'
  | 'estate'
  | 'liftback'
  | 'other';

export type SetPart = 'front' | 'rear' | 'trunk' | 'third_row' | 'general';

export type ProductLine = '3d' | 'classic';

export interface BodyTypeProfile {
  canonical: string;
  seatCount: 5 | 6 | 7 | null;
  family: BodyTypeFamily;
}

export interface CarTemplateWideRow {
  id: string;
  brand: string;
  model: string;
  generation: string | null;
  body_type_1: string;
  body_type_2: string | null;
  body_type_3: string | null;
  notes_general: string | null;
  notes_front_classic: string | null;
  notes_front_3d: string | null;
  notes_rear_classic: string | null;
  notes_rear_3d: string | null;
  notes_third_row: string | null;
  notes_trunk_general: string | null;
  notes_trunk_estate: string | null;
  notes_trunk_hatchback: string | null;
  notes_trunk_sedan: string | null;
  notes_trunk_liftback: string | null;
  notes_trunk_suv_5_seater: string | null;
  notes_trunk_suv_7_seater: string | null;
  notes_trunk_minivan_5_seater: string | null;
  notes_trunk_minivan_7_seater: string | null;
}

export interface SelectedTemplateNote {
  part: SetPart;
  column: CarTemplateNoteColumn;
  text: string;
}

export type TemplateMatchStage1Result =
  | {
      status: 'MATCHED';
      carTemplate: CarTemplateWideRow;
      resolvedBodyProfile: BodyTypeProfile;
    }
  | {
      status: 'NOT_FOUND';
      escalationReason: string;
    }
  | {
      status: 'AMBIGUOUS';
      escalationReason: 'ambiguous_template';
      candidateIds: string[];
    };

export interface NoteSelectionResult {
  notes: SelectedTemplateNote[];
  requiresEscalation: boolean;
  escalationReason?: string;
}

export interface ResolvedProductLineResult {
  line: ProductLine | null;
  requiresCustomProductEscalation?: boolean;
  unknownProduct?: boolean;
}

export interface ResolvedSetVariantResult {
  parts: SetPart[];
  requiresSetVariantEscalation?: boolean;
  escalateSingleMat?: boolean;
}
