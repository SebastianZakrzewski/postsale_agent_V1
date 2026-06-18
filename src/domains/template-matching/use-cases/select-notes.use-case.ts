import { Injectable } from '@nestjs/common';
import { SelectNotesCommand } from '../../../lib/commands/template.commands';
import { TemplateNotesResult } from '../../../lib/domain';
import { TemplateNotesService } from '../services/template-notes.service';

@Injectable()
export class SelectNotesUseCase {
  constructor(private readonly templateNotesService: TemplateNotesService) {}

  execute(command: SelectNotesCommand): Promise<TemplateNotesResult> {
    return this.templateNotesService.selectNotes(command);
  }
}
