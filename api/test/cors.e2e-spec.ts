import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DEFAULT_CORS_ORIGIN, setupCors } from './../src/cors';
import { PrismaService } from './../src/prisma/prisma.service';

describe('CORS (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    setupCors(app, DEFAULT_CORS_ORIGIN);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows the web origin with credentials on a simple request', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', DEFAULT_CORS_ORIGIN);

    expect(response.headers['access-control-allow-origin']).toBe(
      DEFAULT_CORS_ORIGIN,
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('answers a preflight request from the web origin', async () => {
    const response = await request(app.getHttpServer())
      .options('/api/v1/auth/refresh')
      .set('Origin', DEFAULT_CORS_ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      DEFAULT_CORS_ORIGIN,
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.headers['access-control-allow-methods']).toContain('POST');
  });

  it('pins the allowed origin instead of reflecting an unexpected one', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', 'http://evil.example.com');

    expect(response.headers['access-control-allow-origin']).toBe(
      DEFAULT_CORS_ORIGIN,
    );
    expect(response.headers['vary']).toContain('Origin');
  });
});
