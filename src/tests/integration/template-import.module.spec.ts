import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { Test, TestingModule } from '@nestjs/testing';
import { TemplateImportModule } from '../../domains/template-import/template-import.module';
import { ImportTemplateBatchUseCase } from '../../domains/template-import/use-cases/import-template-batch.use-case';
import { TEMPLATE_IMPORT_BATCH_REPOSITORY } from '../../domains/template-import/repository/template-import-batch.repository';
import { CAR_TEMPLATE_REPOSITORY } from '../../domains/template-matching/repository/car-template.repository';
import {
  InMemoryCarTemplateRepository,
  InMemoryTemplateImportBatchRepository,
} from '../helpers/in-memory-template.repositories';

describe('TemplateImportModule (integration)', () => {
  let importUseCase: ImportTemplateBatchUseCase;
  let batchRepository: InMemoryTemplateImportBatchRepository;
  let carTemplateRepository: InMemoryCarTemplateRepository;
  let tempFilePath: string;

  beforeEach(async () => {
    batchRepository = new InMemoryTemplateImportBatchRepository();
    carTemplateRepository = new InMemoryCarTemplateRepository();

    const fixturePath = path.join(
      __dirname,
      '../fixtures/evamats-sanitized-rows.json',
    );
    const fixtureRows = JSON.parse(
      fs.readFileSync(fixturePath, 'utf-8'),
    ) as Record<string, unknown>[];

    const worksheet = XLSX.utils.json_to_sheet(fixtureRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'EVAMATS');
    tempFilePath = path.join(
      os.tmpdir(),
      `evamats-integration-${Date.now()}.xlsx`,
    );
    XLSX.writeFile(workbook, tempFilePath);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TemplateImportModule],
    })
      .overrideProvider(TEMPLATE_IMPORT_BATCH_REPOSITORY)
      .useValue(batchRepository)
      .overrideProvider(CAR_TEMPLATE_REPOSITORY)
      .useValue(carTemplateRepository)
      .compile();

    importUseCase = moduleFixture.get(ImportTemplateBatchUseCase);
  });

  afterEach(() => {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  });

  it('wires ImportTemplateBatchUseCase and creates expected row counts', async () => {
    const result = await importUseCase.execute({
      filePath: tempFilePath,
      sourceFilename: 'evamats-integration.xlsx',
    });

    expect(result.rowCount).toBe(2);
    expect(result.errorCount).toBe(1);
    expect(result.status).toBe('completed');
    expect(carTemplateRepository.getTemplates()).toHaveLength(2);
    expect(carTemplateRepository.getNotes()).toHaveLength(2);
  });
});
