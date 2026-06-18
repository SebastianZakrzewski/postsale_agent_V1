import { Module } from '@nestjs/common';
import { TemplateImportModule } from '../template-import/template-import.module';
import { TemplateMatchingService } from './services/template-matching.service';
import { TemplateNotesService } from './services/template-notes.service';
import { MatchTemplateUseCase } from './use-cases/match-template.use-case';
import { SelectNotesUseCase } from './use-cases/select-notes.use-case';

@Module({
  imports: [TemplateImportModule],
  providers: [
    TemplateMatchingService,
    TemplateNotesService,
    MatchTemplateUseCase,
    SelectNotesUseCase,
  ],
  exports: [MatchTemplateUseCase, SelectNotesUseCase],
})
export class TemplateMatchingModule {}
