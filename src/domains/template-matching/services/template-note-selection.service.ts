import { Injectable } from '@nestjs/common';
import { resolveProductLine } from '../config/bitrix-product-line';
import {
  readNoteTextForPart,
  resolveNoteColumnForPart,
} from '../config/note-column-resolver';
import { resolveSetVariantParts } from '../config/bitrix-set-variant-parts';
import {
  CarTemplateWideRow,
  NoteSelectionResult,
  SelectedTemplateNote,
} from '../types';
import { BodyTypeProfile } from '../types';

@Injectable()
export class TemplateNoteSelectionService {
  selectNotes(input: {
    carTemplate: CarTemplateWideRow;
    product: string;
    productEnumId?: string | null;
    setVariantId?: string | null;
    resolvedBodyProfile: BodyTypeProfile;
  }): NoteSelectionResult {
    const productLineResult = resolveProductLine({
      product: input.product,
      productEnumId: input.productEnumId,
    });

    if (productLineResult.requiresCustomProductEscalation) {
      return {
        notes: [],
        requiresEscalation: true,
        escalationReason: 'requires_custom_product_escalation',
      };
    }

    if (productLineResult.unknownProduct || !productLineResult.line) {
      return {
        notes: [],
        requiresEscalation: true,
        escalationReason: 'unknown_product_line',
      };
    }

    const variantResult = resolveSetVariantParts(input.setVariantId);
    if (variantResult.escalateSingleMat) {
      return {
        notes: [],
        requiresEscalation: true,
        escalationReason: 'single_mat_variant_escalation',
      };
    }

    if (variantResult.requiresSetVariantEscalation) {
      return {
        notes: [],
        requiresEscalation: true,
        escalationReason: 'requires_set_variant_escalation',
      };
    }

    const notes: SelectedTemplateNote[] = [];

    for (const part of variantResult.parts) {
      const resolvedColumn = resolveNoteColumnForPart(
        part,
        productLineResult.line,
        input.resolvedBodyProfile,
      );
      const { text, column } = readNoteTextForPart(
        input.carTemplate,
        part,
        resolvedColumn,
      );

      if (text) {
        notes.push({ part, column, text });
      }
    }

    // Empty note columns are valid: not every body type needs notes for every set part.
    return {
      notes,
      requiresEscalation: false,
    };
  }
}
