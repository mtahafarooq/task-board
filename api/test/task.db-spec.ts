import { PrismaClient } from '@prisma/client';

describe('Task model and migration (db)', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.task.deleteMany();
    await prisma.user.deleteMany();
  });

  const createUser = (email = 'owner@example.com') =>
    prisma.user.create({
      data: { email, name: 'Owner', passwordHash: 'hash' },
    });

  it('created the Task table and recorded the migration as applied', async () => {
    const tables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'Task'
    `;
    expect(tables.map((row) => row.table_name)).toContain('Task');

    const migrations = await prisma.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name
      FROM _prisma_migrations
      WHERE finished_at IS NOT NULL
    `;
    expect(migrations.map((row) => row.migration_name)).toContain(
      '20261013000358_add_task_model',
    );
  });

  it('stores a title, optional fields, completion state, owner, and timestamps', async () => {
    const owner = await createUser();
    const due = new Date('2030-01-02T03:04:05.000Z');

    const task = await prisma.task.create({
      data: {
        title: 'Write the report',
        description: 'Quarterly numbers',
        dueDate: due,
        completed: true,
        ownerId: owner.id,
      },
    });

    expect(task.id).toEqual(expect.any(String));
    expect(task.id.length).toBeGreaterThan(0);
    expect(task.title).toBe('Write the report');
    expect(task.description).toBe('Quarterly numbers');
    expect(task.dueDate?.toISOString()).toBe(due.toISOString());
    expect(task.completed).toBe(true);
    expect(task.ownerId).toBe(owner.id);
    expect(task.createdAt).toBeInstanceOf(Date);
    expect(task.updatedAt).toBeInstanceOf(Date);
  });

  it('defaults completed to false and allows description and due date to be omitted', async () => {
    const owner = await createUser();

    const task = await prisma.task.create({
      data: { title: 'Minimal task', ownerId: owner.id },
    });

    expect(task.completed).toBe(false);
    expect(task.description).toBeNull();
    expect(task.dueDate).toBeNull();
  });

  it('cascades deletes from the user to their tasks', async () => {
    const owner = await createUser();
    await prisma.task.createMany({
      data: [
        { title: 'One', ownerId: owner.id },
        { title: 'Two', ownerId: owner.id },
      ],
    });
    await expect(prisma.task.count()).resolves.toBe(2);

    await prisma.user.delete({ where: { id: owner.id } });

    await expect(prisma.task.count()).resolves.toBe(0);
  });

  it('indexes the tasks by owner and completion state', async () => {
    const indexes = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'Task'
    `;
    const names = indexes.map((row) => row.indexname);
    expect(names).toContain('Task_ownerId_completed_idx');
    expect(names).toContain('Task_ownerId_createdAt_idx');
  });

  it('lists tasks by owner and completion state', async () => {
    const owner = await createUser('list-owner@example.com');
    const other = await createUser('other@example.com');
    await prisma.task.createMany({
      data: [
        { title: 'Mine done', ownerId: owner.id, completed: true },
        { title: 'Mine open', ownerId: owner.id, completed: false },
        { title: 'Theirs done', ownerId: other.id, completed: true },
      ],
    });

    const done = await prisma.task.findMany({
      where: { ownerId: owner.id, completed: true },
    });
    expect(done.map((task) => task.title)).toEqual(['Mine done']);

    const mine = await prisma.task.findMany({ where: { ownerId: owner.id } });
    expect(mine).toHaveLength(2);
  });

  it('advances updatedAt when the row changes', async () => {
    const owner = await createUser();
    const created = await prisma.task.create({
      data: { title: 'Before', ownerId: owner.id },
    });

    const updated = await prisma.task.update({
      where: { id: created.id },
      data: { completed: true },
    });

    expect(updated.completed).toBe(true);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
      created.updatedAt.getTime(),
    );
  });
});
