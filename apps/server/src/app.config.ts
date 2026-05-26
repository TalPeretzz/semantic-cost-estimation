import { INestApplication } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  const corsOrigin =
    process.env['CORS_ORIGIN'] ??
    (process.env['NODE_ENV'] === 'production' ? false : 'http://localhost:3000');
  app.enableCors({ origin: corsOrigin, credentials: true });
  app.setGlobalPrefix('api/v1');
}
