import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { SWAGGER_PATH, setupSwagger } from './../src/swagger';

describe('API docs (e2e)', () => {
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
    setupSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the OpenAPI document describing every endpoint', async () => {
    const response = await request(app.getHttpServer()).get(
      `/${SWAGGER_PATH}-json`,
    );

    expect(response.status).toBe(200);
    expect(response.body.info.title).toBe('Task Board API');

    const paths = Object.keys(response.body.paths).map((path) =>
      path.replace('/api/v1', ''),
    );
    expect(paths).toEqual(
      expect.arrayContaining([
        '/health',
        '/auth/register',
        '/auth/login',
        '/auth/refresh',
        '/auth/logout',
        '/auth/me',
        '/tasks',
        '/tasks/{id}',
      ]),
    );
  });

  it('serves the Swagger UI', async () => {
    const response = await request(app.getHttpServer()).get(`/${SWAGGER_PATH}`);

    expect(response.status).toBe(200);
    expect(response.text).toContain('Swagger UI');
  });
});
