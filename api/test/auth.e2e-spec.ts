import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const CREDENTIALS = {
  email: 'ada@example.com',
  name: 'Ada Lovelace',
  password: 'supersecret',
};

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let users: StoredUser[];

  const prismaMock = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    user: {
      findUnique: jest.fn(
        async ({ where }: { where: { email?: string; id?: string } }) => {
          if (where.email) {
            return users.find((user) => user.email === where.email) ?? null;
          }
          if (where.id) {
            return users.find((user) => user.id === where.id) ?? null;
          }
          return null;
        },
      ),
      create: jest.fn(
        async ({
          data,
        }: {
          data: Pick<StoredUser, 'email' | 'name' | 'passwordHash'>;
        }) => {
          const now = new Date();
          const user: StoredUser = {
            id: randomUUID(),
            createdAt: now,
            updatedAt: now,
            ...data,
          };
          users.push(user);
          return user;
        },
      ),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    users = [];
    prismaMock.user.create.mockClear();
    prismaMock.user.findUnique.mockClear();
  });

  const registerUser = (target = request(app.getHttpServer())) =>
    target.post('/api/v1/auth/register').send(CREDENTIALS);

  it('registers a user with a bcrypt hash and never returns the hash', async () => {
    const response = await registerUser();

    expect(response.status).toBe(201);
    expect(response.body.data.user).toMatchObject({
      email: CREDENTIALS.email,
      name: CREDENTIALS.name,
    });
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
    expect(typeof response.body.data.accessToken).toBe('string');

    const setCookie =
      (response.headers['set-cookie'] as unknown as string[]) ?? [];
    const refreshCookie = setCookie.find((cookie) =>
      cookie.startsWith('refresh_token='),
    );
    expect(refreshCookie).toBeDefined();
    expect(/HttpOnly/i.test(refreshCookie as string)).toBe(true);

    expect(users).toHaveLength(1);
    expect(users[0].passwordHash).not.toBe(CREDENTIALS.password);
    expect(users[0].passwordHash.startsWith('$2')).toBe(true);
    await expect(
      bcrypt.compare(CREDENTIALS.password, users[0].passwordHash),
    ).resolves.toBe(true);
  });

  it('rejects a duplicate email with 409', async () => {
    await registerUser();
    const response = await registerUser();

    expect(response.status).toBe(409);
    expect(users).toHaveLength(1);
  });

  it('returns 400 for invalid registration input', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', name: 'Ada', password: 'short' });

    expect(response.status).toBe(400);
  });

  it('returns an access token and a refresh cookie on login', async () => {
    await registerUser();

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: CREDENTIALS.email, password: CREDENTIALS.password });

    expect(response.status).toBe(200);
    expect(typeof response.body.data.accessToken).toBe('string');
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
    const setCookie =
      (response.headers['set-cookie'] as unknown as string[]) ?? [];
    expect(
      setCookie.some((cookie) => cookie.startsWith('refresh_token=')),
    ).toBe(true);
  });

  it('returns 401 for a wrong password and an unknown email alike', async () => {
    await registerUser();

    const wrongPassword = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: CREDENTIALS.email, password: 'wrong-password' });
    const unknownEmail = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: CREDENTIALS.password });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  it('issues a new access token from a valid refresh cookie', async () => {
    const agent = request.agent(app.getHttpServer());
    await registerUser(agent);

    const response = await agent.post('/api/v1/auth/refresh');

    expect(response.status).toBe(200);
    expect(typeof response.body.data.accessToken).toBe('string');

    const profile = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${response.body.data.accessToken}`);
    expect(profile.status).toBe(200);
  });

  it('rejects refresh without a valid cookie', async () => {
    const missing = await request(app.getHttpServer()).post(
      '/api/v1/auth/refresh',
    );
    const invalid = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'refresh_token=not-a-jwt');

    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
  });

  it('clears the refresh cookie on logout', async () => {
    const agent = request.agent(app.getHttpServer());
    await registerUser(agent);

    const response = await agent.post('/api/v1/auth/logout');

    expect(response.status).toBe(200);
    const setCookie =
      (response.headers['set-cookie'] as unknown as string[]) ?? [];
    const cleared = setCookie.find((cookie) =>
      cookie.startsWith('refresh_token='),
    );
    expect(cleared).toBeDefined();
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it('returns the authenticated profile from /auth/me', async () => {
    const registered = await registerUser();

    const profile = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${registered.body.data.accessToken}`);

    expect(profile.status).toBe(200);
    expect(profile.body.data).toMatchObject({
      id: registered.body.data.user.id,
      email: CREDENTIALS.email,
      name: CREDENTIALS.name,
    });
    expect(profile.body.data).not.toHaveProperty('passwordHash');
  });

  it('rejects /auth/me without or with an invalid bearer token', async () => {
    const missing = await request(app.getHttpServer()).get('/api/v1/auth/me');
    const invalid = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not-a-jwt');

    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
  });
});
