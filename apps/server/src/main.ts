import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { configureApp } from './app.config';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const port = process.env['SERVER_PORT'] ?? 3001;
  await app.listen(port);
  logger.log(`Server is running on http://localhost:${port}/api/v1`);
}

bootstrap().catch((err: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start server', err instanceof Error ? err.stack : String(err));
  process.exit(1);
});
