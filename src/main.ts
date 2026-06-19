import { NestFactory } from '@nestjs/core';
import { loadProjectDotEnv } from './lib/cli/load-dotenv';
import { AppModule } from './app/modules/app.module';

loadProjectDotEnv();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

bootstrap();
