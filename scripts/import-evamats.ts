/**
 * One-time EVAMATS template import into Supabase.
 *
 * Task-11: EVAMATS production data migration — see docs/tasks/task-11.md
 *
 * Sample command:
 *   npx ts-node -r tsconfig-paths/register scripts/import-evamats.ts --file=./data/evamats.xlsx
 *
 * Required environment variables:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_DB_SCHEMA (optional, defaults to postsale_agent_evapremium)
 */
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { parseFileArg } from '../src/lib/cli/parse-file-arg';
import { TemplateImportModule } from '../src/domains/template-import/template-import.module';
import { ImportTemplateBatchUseCase } from '../src/domains/template-import/use-cases/import-template-batch.use-case';

@Module({
  imports: [TemplateImportModule],
})
class ImportCliModule {}

async function main(): Promise<void> {
  const filePath = parseFileArg(process.argv.slice(2));

  if (!filePath) {
    console.error(
      'Usage: npx ts-node scripts/import-evamats.ts --file=./path/to/evamats.xlsx',
    );
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(ImportCliModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const useCase = app.get(ImportTemplateBatchUseCase);
    const result = await useCase.execute({ filePath });

    console.log(
      JSON.stringify(
        {
          batchId: result.batchId,
          rowCount: result.rowCount,
          errorCount: result.errorCount,
          status: result.status,
        },
        null,
        2,
      ),
    );

    if (result.status === 'failed') {
      process.exit(1);
    }
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
