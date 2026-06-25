import { Injectable } from '@nestjs/common';
import { TemplateMatchingService } from '../../template-matching/services/template-matching.service';
import { TemplateNoteSelectionService } from '../../template-matching/services/template-note-selection.service';
import { SelectedTemplateNote } from '../../template-matching/types';
import { Workflow } from '../../../lib/domain';

export type SelectedNotesResolution =
  | { ok: true; notes: SelectedTemplateNote[] }
  | { ok: false; reason: string };

@Injectable()
export class SelectedTemplateNotesResolver {
  constructor(
    private readonly templateMatchingService: TemplateMatchingService,
    private readonly templateNoteSelectionService: TemplateNoteSelectionService,
  ) {}

  async resolve(workflow: Workflow): Promise<SelectedNotesResolution> {
    if (!workflow.dealContext) {
      return { ok: false, reason: 'missing_deal_context' };
    }

    if (!workflow.carTemplateId) {
      return { ok: false, reason: 'missing_car_template_id' };
    }

    const stage1 = await this.templateMatchingService.matchDealContext(
      workflow.dealContext,
    );

    if (stage1.status !== 'MATCHED') {
      return { ok: false, reason: 'template_match_not_reproducible' };
    }

    if (stage1.carTemplate.id !== workflow.carTemplateId) {
      return { ok: false, reason: 'template_id_mismatch' };
    }

    const noteResult = this.templateNoteSelectionService.selectNotes({
      carTemplate: stage1.carTemplate,
      product: workflow.dealContext.product,
      productEnumId: workflow.dealContext.productEnumId,
      setVariantId: workflow.dealContext.setVariantId,
      resolvedBodyProfile: stage1.resolvedBodyProfile,
    });

    if (noteResult.requiresEscalation) {
      return {
        ok: false,
        reason: noteResult.escalationReason ?? 'note_selection_escalation',
      };
    }

    return { ok: true, notes: noteResult.notes };
  }
}
