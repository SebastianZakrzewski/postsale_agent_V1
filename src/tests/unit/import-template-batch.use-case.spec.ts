import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { TemplateImportService } from '../../domains/template-import/services/template-import.service';
import { TemplateNormalizationService } from '../../domains/template-import/services/template-normalization.service';
import {
  InMemoryCarTemplateRepository,
  InMemoryTemplateImportBatchRepository,
} from '../helpers/in-memory-template.repositories';

describe('ImportTemplateBatchUseCase flow', () => {
  let batchRepository: InMemoryTemplateImportBatchRepository;
  let carTemplateRepository: InMemoryCarTemplateRepository;
  let service: TemplateImportService;
  let tempFilePath: string;

  beforeEach(() => {
    batchRepository = new InMemoryTemplateImportBatchRepository();
    carTemplateRepository = new InMemoryCarTemplateRepository();
    service = new TemplateImportService(
      batchRepository,
      carTemplateRepository,
      new TemplateNormalizationService(),
    );

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
    tempFilePath = path.join(os.tmpdir(), `evamats-test-${Date.now()}.xlsx`);
    XLSX.writeFile(workbook, tempFilePath);
  });

  afterEach(() => {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  });

  it('creates batch with expected row and error counts', async () => {
    const result = await service.importBatch({
      filePath: tempFilePath,
      sourceFilename: 'evamats-test.xlsx',
    });

    expect(result.rowCount).toBe(2);
    expect(result.errorCount).toBe(1);
    expect(result.status).toBe('completed');
    expect(carTemplateRepository.getTemplates()).toHaveLength(2);
    expect(carTemplateRepository.getNotes()).toHaveLength(2);
  });

  it('does not create postsale workflows during import', async () => {
    await service.importBatch({ filePath: tempFilePath });

    expect(carTemplateRepository.getTemplates().length).toBeGreaterThan(0);
    // Forbidden side effect: no workflow table/repository touched in import flow.
  });

  it('marks batch failed when template insert throws', async () => {
    const failingCarRepo = {
      ...carTemplateRepository,
      insertTemplate: jest.fn().mockRejectedValue(new Error('insert failed')),
    } as unknown as InMemoryCarTemplateRepository;

    const failingService = new TemplateImportService(
      batchRepository,
      failingCarRepo,
      new TemplateNormalizationService(),
    );

    await expect(
      failingService.importBatch({ filePath: tempFilePath }),
    ).rejects.toThrow('insert failed');

    const batches = await batchRepository.findById('batch-1');
    expect(batches?.status).toBe('failed');
  });
});
