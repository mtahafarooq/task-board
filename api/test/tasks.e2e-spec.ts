import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
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

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  completed: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskWhere {
  id?: string;
  ownerId?: string;
  completed?: boolean;
}

describe('Tasks (e2e)', () => {
  let app: INestApplication;
  let users: StoredUser[];
  let tasks: TaskRow[];
  let sequence: number;

  const nextId = (prefix: string): string => `${prefix}-${++sequence}`;

  const matches = (task: TaskRow, where: TaskWhere): boolean => {
    if (where.id !== undefined && task.id !== where.id) return false;
    if (where.ownerId !== undefined && task.ownerId !== where.ownerId) {
      return false;
    }
    if (where.completed !== undefined && task.completed !== where.completed) {
      return false;
    }
    return true;
  };

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
            id: nextId('user'),
            createdAt: now,
            updatedAt: now,
            ...data,
          };
          users.push(user);
          return user;
        },
      ),
    },
    task: {
      create: jest.fn(
        async ({
          data,
        }: {
          data: {
            title: string;
            description?: string | null;
            dueDate?: string | null;
            completed?: boolean;
            ownerId: string;
          };
        }) => {
          const now = new Date();
          const task: TaskRow = {
            id: nextId('task'),
            title: data.title,
            description: data.description ?? null,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            completed: data.completed ?? false,
            ownerId: data.ownerId,
            createdAt: now,
            updatedAt: now,
          };
          tasks.push(task);
          return task;
        },
      ),
      count: jest.fn(
        async ({ where }: { where: TaskWhere }) =>
          tasks.filter((task) => matches(task, where)).length,
      ),
      findMany: jest.fn(
        async ({
          where,
          skip = 0,
          take,
        }: {
          where: TaskWhere;
          skip?: number;
          take?: number;
        }) => {
          const found = tasks
            .filter((task) => matches(task, where))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          return typeof take === 'number'
            ? found.slice(skip, skip + take)
            : found.slice(skip);
        },
      ),
      findFirst: jest.fn(
        async ({ where }: { where: TaskWhere }) =>
          tasks.find((task) => matches(task, where)) ?? null,
      ),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<TaskRow>;
        }) => {
          const task = tasks.find((row) => row.id === where.id);
          if (!task) {
            throw new Error('Task not found');
          }
          Object.assign(task, data, { updatedAt: new Date() });
          if (data.dueDate !== undefined) {
            task.dueDate = data.dueDate ? new Date(data.dueDate) : null;
          }
          return task;
        },
      ),
      delete: jest.fn(async ({ where }: { where: { id: string } }) => {
        const index = tasks.findIndex((row) => row.id === where.id);
        const [removed] = tasks.splice(index, 1);
        return removed;
      }),
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
    tasks = [];
    sequence = 0;
  });

  const register = async (
    email: string,
  ): Promise<{ token: string; userId: string }> => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, name: 'Ada Lovelace', password: 'supersecret' });
    return {
      token: response.body.data.accessToken,
      userId: response.body.data.user.id,
    };
  };

  const auth = (token: string): string => `Bearer ${token}`;

  it('requires authentication for every task endpoint', async () => {
    const list = await request(app.getHttpServer()).get('/api/v1/tasks');
    const create = await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .send({ title: 'Nope' });

    expect(list.status).toBe(401);
    expect(create.status).toBe(401);
  });

  it('creates a task owned by the authenticated user', async () => {
    const { token, userId } = await register('ada@example.com');

    const response = await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .set('Authorization', auth(token))
      .send({ title: 'Write the report' });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      title: 'Write the report',
      description: null,
      dueDate: null,
      completed: false,
      ownerId: userId,
    });
    expect(typeof response.body.data.id).toBe('string');
  });

  it('rejects invalid task input with a structured 400', async () => {
    const { token } = await register('ada@example.com');

    const response = await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .set('Authorization', auth(token))
      .send({ title: '' });

    expect(response.status).toBe(400);
    expect(response.body.statusCode).toBe(400);
    expect(Array.isArray(response.body.message)).toBe(true);
  });

  it('lists only the current user tasks with pagination metadata', async () => {
    const ada = await register('ada@example.com');
    const bob = await register('bob@example.com');

    for (let index = 0; index < 3; index += 1) {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', auth(ada.token))
        .send({ title: `Ada ${index}` });
    }
    await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .set('Authorization', auth(bob.token))
      .send({ title: 'Bob only' });

    const response = await request(app.getHttpServer())
      .get('/api/v1/tasks')
      .set('Authorization', auth(ada.token));

    expect(response.status).toBe(200);
    expect(response.body.data.data).toHaveLength(3);
    expect(
      response.body.data.data.every(
        (task: TaskRow) => task.ownerId === ada.userId,
      ),
    ).toBe(true);
    expect(response.body.data.meta).toEqual({
      page: 1,
      limit: 20,
      total: 3,
      totalPages: 1,
    });
  });

  it('paginates and filters the list by completion state', async () => {
    const { token } = await register('ada@example.com');

    for (let index = 0; index < 3; index += 1) {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', auth(token))
        .send({ title: `Task ${index}` });
    }

    const first = await request(app.getHttpServer())
      .get('/api/v1/tasks?page=1&limit=2')
      .set('Authorization', auth(token));
    expect(first.body.data.data).toHaveLength(2);
    expect(first.body.data.meta).toMatchObject({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });

    const completed = await request(app.getHttpServer())
      .get('/api/v1/tasks?completed=true')
      .set('Authorization', auth(token));
    expect(completed.body.data.data).toHaveLength(0);

    const open = await request(app.getHttpServer())
      .get('/api/v1/tasks?completed=false')
      .set('Authorization', auth(token));
    expect(open.body.data.data).toHaveLength(3);
  });

  it('reads, updates, and deletes an owned task', async () => {
    const { token } = await register('ada@example.com');
    const created = await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .set('Authorization', auth(token))
      .send({ title: 'Write the report' });
    const taskId = created.body.data.id;

    const read = await request(app.getHttpServer())
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', auth(token));
    expect(read.status).toBe(200);
    expect(read.body.data.id).toBe(taskId);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/tasks/${taskId}`)
      .set('Authorization', auth(token))
      .send({ completed: true, title: 'Write the report v2' });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      id: taskId,
      title: 'Write the report v2',
      completed: true,
    });

    const removed = await request(app.getHttpServer())
      .delete(`/api/v1/tasks/${taskId}`)
      .set('Authorization', auth(token));
    expect(removed.status).toBe(204);

    const gone = await request(app.getHttpServer())
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', auth(token));
    expect(gone.status).toBe(404);
  });

  it('hides another user task behind a 404 for read, update, and delete', async () => {
    const ada = await register('ada@example.com');
    const bob = await register('bob@example.com');
    const created = await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .set('Authorization', auth(ada.token))
      .send({ title: 'Ada private' });
    const taskId = created.body.data.id;

    const read = await request(app.getHttpServer())
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', auth(bob.token));
    const update = await request(app.getHttpServer())
      .patch(`/api/v1/tasks/${taskId}`)
      .set('Authorization', auth(bob.token))
      .send({ title: 'Hijacked' });
    const remove = await request(app.getHttpServer())
      .delete(`/api/v1/tasks/${taskId}`)
      .set('Authorization', auth(bob.token));

    expect(read.status).toBe(404);
    expect(update.status).toBe(404);
    expect(remove.status).toBe(404);

    const stillThere = await request(app.getHttpServer())
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', auth(ada.token));
    expect(stillThere.status).toBe(200);
    expect(stillThere.body.data.title).toBe('Ada private');
  });

  it('returns 400 for invalid list query parameters', async () => {
    const { token } = await register('ada@example.com');

    const response = await request(app.getHttpServer())
      .get('/api/v1/tasks?limit=1000')
      .set('Authorization', auth(token));

    expect(response.status).toBe(400);
    expect(response.body.statusCode).toBe(400);
  });
});
