import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { validateEnv } from './config/env.validation';
import { setupCors } from './cors';
import { SWAGGER_PATH, setupSwagger } from './swagger';

const API_PREFIX = 'api/v1';

async function bootstrap(): Promise<void> {
  const env = validateEnv();

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(API_PREFIX);
  app.use(cookieParser());
  setupCors(app, env.CORS_ORIGIN);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  setupSwagger(app);

  await app.listen(env.PORT);

  Logger.log(
    `API listening on http://localhost:${env.PORT}/${API_PREFIX}`,
    'Bootstrap',
  );
  Logger.log(
    `Swagger UI on http://localhost:${env.PORT}/${SWAGGER_PATH}`,
    'Bootstrap',
  );
}

bootstrap().catch((error: unknown) => {
  Logger.error(
    error instanceof Error ? error.message : String(error),
    'Bootstrap',
  );
  process.exit(1);
});
