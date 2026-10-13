import { Injectable, NotFoundException } from '@nestjs/common';
import { Task } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  ListTasksQueryDto,
} from './dto/list-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

export interface PaginatedTasks {
  data: Task[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateTaskDto): Promise<Task> {
    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        dueDate: dto.dueDate ?? null,
        completed: dto.completed ?? false,
        ownerId: userId,
      },
    });
  }

  async findAll(
    userId: string,
    query: ListTasksQueryDto,
  ): Promise<PaginatedTasks> {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const where = {
      ownerId: userId,
      ...(query.completed === undefined ? {} : { completed: query.completed }),
    };

    const [total, data] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  findOne(userId: string, id: string): Promise<Task> {
    return this.findOwnedTask(userId, id);
  }

  async update(userId: string, id: string, dto: UpdateTaskDto): Promise<Task> {
    await this.findOwnedTask(userId, id);
    return this.prisma.task.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwnedTask(userId, id);
    await this.prisma.task.delete({ where: { id } });
  }

  private async findOwnedTask(userId: string, id: string): Promise<Task> {
    const task = await this.prisma.task.findFirst({
      where: { id, ownerId: userId },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }
}
