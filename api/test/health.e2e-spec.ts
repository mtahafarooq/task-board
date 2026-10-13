import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Health (e2e)', () => {
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
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns 200 with a status payload in the success envelope', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      statusCode: 200,
      data: { status: 'ok' },
    });
    expect(typeof response.body.data.uptime).toBe('number');
    expect(Number.isNaN(Date.parse(response.body.data.timestamp))).toBe(false);
  });

  it('unknown routes return 404 in the error envelope', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/nope');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      statusCode: 404,
      path: '/api/v1/nope',
    });
  });
});
