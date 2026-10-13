import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let prisma: {
    task: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let service: TasksService;

  beforeEach(() => {
    prisma = {
      task: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new TasksService(prisma as unknown as PrismaService);
  });

  it('creates a task owned by the given user', async () => {
    prisma.task.create.mockResolvedValue({ id: 'task-1' });

    await service.create('user-1', { title: 'Write the report' });

    expect(prisma.task.create).toHaveBeenCalledWith({
      data: {
        title: 'Write the report',
        description: null,
        dueDate: null,
        completed: false,
        ownerId: 'user-1',
      },
    });
  });

  it('passes through the optional fields on create', async () => {
    prisma.task.create.mockResolvedValue({ id: 'task-1' });

    await service.create('user-1', {
      title: 'Write the report',
      description: 'Quarterly numbers',
      dueDate: '2030-01-02T03:04:05.000Z',
      completed: true,
    });

    expect(prisma.task.create).toHaveBeenCalledWith({
      data: {
        title: 'Write the report',
        description: 'Quarterly numbers',
        dueDate: '2030-01-02T03:04:05.000Z',
        completed: true,
        ownerId: 'user-1',
      },
    });
  });

  it('lists only the user tasks with pagination and a completion filter', async () => {
    prisma.task.count.mockResolvedValue(25);
    prisma.task.findMany.mockResolvedValue([{ id: 'task-1' }]);

    const result = await service.findAll('user-1', {
      page: 2,
      limit: 10,
      completed: true,
    });

    expect(prisma.task.count).toHaveBeenCalledWith({
      where: { ownerId: 'user-1', completed: true },
    });
    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: { ownerId: 'user-1', completed: true },
      orderBy: { createdAt: 'desc' },
      skip: 10,
      take: 10,
    });
    expect(result.meta).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
    expect(result.data).toHaveLength(1);
  });

  it('omits the completion filter when it is not provided', async () => {
    prisma.task.count.mockResolvedValue(0);
    prisma.task.findMany.mockResolvedValue([]);

    await service.findAll('user-1', { page: 1, limit: 20 });

    expect(prisma.task.count).toHaveBeenCalledWith({
      where: { ownerId: 'user-1' },
    });
  });

  it('returns an owned task by id', async () => {
    const task = { id: 'task-1', ownerId: 'user-1' };
    prisma.task.findFirst.mockResolvedValue(task);

    await expect(service.findOne('user-1', 'task-1')).resolves.toBe(task);
    expect(prisma.task.findFirst).toHaveBeenCalledWith({
      where: { id: 'task-1', ownerId: 'user-1' },
    });
  });

  it('refuses to read a task owned by someone else', async () => {
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(service.findOne('user-1', 'task-9')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates an owned task', async () => {
    prisma.task.findFirst.mockResolvedValue({
      id: 'task-1',
      ownerId: 'user-1',
    });
    prisma.task.update.mockResolvedValue({ id: 'task-1', completed: true });

    await service.update('user-1', 'task-1', { completed: true });

    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { completed: true },
    });
  });

  it('refuses to update a task owned by someone else', async () => {
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(
      service.update('user-1', 'task-9', { title: 'Hijacked' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.task.update).not.toHaveBeenCalled();
  });

  it('deletes an owned task', async () => {
    prisma.task.findFirst.mockResolvedValue({
      id: 'task-1',
      ownerId: 'user-1',
    });
    prisma.task.delete.mockResolvedValue({ id: 'task-1' });

    await service.remove('user-1', 'task-1');

    expect(prisma.task.delete).toHaveBeenCalledWith({
      where: { id: 'task-1' },
    });
  });

  it('refuses to delete a task owned by someone else', async () => {
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(service.remove('user-1', 'task-9')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.task.delete).not.toHaveBeenCalled();
  });
});
