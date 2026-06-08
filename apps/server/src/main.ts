import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.config';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const config = new DocumentBuilder()
    .setTitle('Semantic Cost Estimation API')
    .setDescription(
      'Hybrid COCOMO II + LLM effort estimation — REST API for the master\'s thesis research tool.',
    )
    .setVersion('1.0')
    .addTag('projects', 'Project CRUD')
    .addTag('estimations', 'Run and retrieve effort estimations')
    .addTag('evaluations', 'MAE/RMSE/MAPE evaluation runs')
    .addTag('datasets', 'Bulk CSV import of historical projects')
    .addTag('health', 'Health check')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);

  const port = process.env['SERVER_PORT'] ?? 3001;
  await app.listen(port);
  logger.log(`Server is running on http://localhost:${port}/api/v1`);
  logger.log(`Swagger docs at http://localhost:${port}/api/v1/docs`);
}

bootstrap().catch((err: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start server', err instanceof Error ? err.stack : String(err));
  process.exit(1);
});
