import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { loadProjectDotEnv } from './lib/cli/load-dotenv';
import { AppModule } from './app/modules/app.module';

loadProjectDotEnv();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Inbound n8n webhooks may include base64 image attachments.
  app.useBodyParser('json', { limit: '10mb' });
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

bootstrap();
