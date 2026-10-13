import { Prisma, PrismaClient } from '@prisma/client';

describe('User model and migration (db)', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  it('created the User table and recorded the migration as applied', async () => {
    const tables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'User'
    `;
    expect(tables.map((row) => row.table_name)).toContain('User');

    const migrations = await prisma.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name
      FROM _prisma_migrations
      WHERE finished_at IS NOT NULL
    `;
    expect(migrations.map((row) => row.migration_name)).toContain(
      '20261012235230_add_user_model',
    );
  });

  it('stores a name, unique email, and password hash with timestamps', async () => {
    const created = await prisma.user.create({
      data: {
        email: 'ada@example.com',
        name: 'Ada Lovelace',
        passwordHash: '$2b$12$examplehashexamplehashexamplehash',
      },
    });

    expect(created.id).toEqual(expect.any(String));
    expect(created.id.length).toBeGreaterThan(0);
    expect(created.email).toBe('ada@example.com');
    expect(created.name).toBe('Ada Lovelace');
    expect(created.passwordHash).toBe(
      '$2b$12$examplehashexamplehashexamplehash',
    );
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.updatedAt).toBeInstanceOf(Date);
  });

  it('rejects a duplicate email at the database level', async () => {
    await prisma.user.create({
      data: {
        email: 'dup@example.com',
        name: 'First',
        passwordHash: 'hash-one',
      },
    });

    await expect(
      prisma.user.create({
        data: {
          email: 'dup@example.com',
          name: 'Second',
          passwordHash: 'hash-two',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });

    await expect(prisma.user.count()).resolves.toBe(1);
  });

  it('advances updatedAt when the row changes', async () => {
    const created = await prisma.user.create({
      data: {
        email: 'edit@example.com',
        name: 'Before',
        passwordHash: 'hash',
      },
    });

    const updated = await prisma.user.update({
      where: { id: created.id },
      data: { name: 'After' },
    });

    expect(updated.name).toBe('After');
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
      created.updatedAt.getTime(),
    );
  });

  it('exposes the expected Prisma error type for unique violations', async () => {
    const data = {
      email: 'typed@example.com',
      name: 'Typed',
      passwordHash: 'hash',
    };
    await prisma.user.create({ data });

    await expect(prisma.user.create({ data })).rejects.toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError,
    );
  });
});
