export interface ApiSuccessResponse<T> {
  success: true;
  statusCode: number;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResult {
  user: User;
  accessToken: string;
}

export interface RegisterInput {
  email: string;
  name: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  completed?: boolean;
}

export type UpdateTaskInput = Partial<CreateTaskInput>;

export interface ListTasksParams {
  page?: number;
  limit?: number;
  completed?: boolean;
}
