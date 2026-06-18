export interface ImportTemplateBatchCommand {
  filePath: string;
  sourceFilename?: string;
}

export interface MatchTemplateCommand {
  brand: string;
  model: string;
  bodyType: string;
  generation?: string | null;
}

export interface SelectNotesCommand {
  carTemplateId: string;
  product: string;
  bodyType: string;
}
