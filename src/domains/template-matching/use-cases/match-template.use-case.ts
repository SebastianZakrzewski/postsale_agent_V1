import { Injectable } from '@nestjs/common';
import { MatchTemplateCommand } from '../../../lib/commands/template.commands';
import { TemplateMatchResult } from '../../../lib/domain';
import { TemplateMatchingService } from '../services/template-matching.service';

@Injectable()
export class MatchTemplateUseCase {
  constructor(
    private readonly templateMatchingService: TemplateMatchingService,
  ) {}

  execute(command: MatchTemplateCommand): Promise<TemplateMatchResult> {
    return this.templateMatchingService.match(command);
  }
}
