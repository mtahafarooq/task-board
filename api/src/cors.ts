import { INestApplication } from '@nestjs/common';

export const DEFAULT_CORS_ORIGIN = 'http://localhost:3000';

export function setupCors(app: INestApplication, origin: string): void {
  app.enableCors({
    origin,
    credentials: true,
  });
}
