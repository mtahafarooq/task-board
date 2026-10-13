import { ApiError } from "./errors";
import { TokenStore, createTokenStore } from "./token-store";
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  AuthResult,
  CreateTaskInput,
  ListTasksParams,
  LoginInput,
  Paginated,
  RegisterInput,
  Task,
  UpdateTaskInput,
  User,
} from "./types";

export const DEFAULT_API_BASE_URL = "http://localhost:3001/api/v1";

export interface ApiClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  tokenStore?: TokenStore;
  onUnauthenticated?: () => void;
}

interface RequestOptions {
  allowRefresh?: boolean;
}

export function redirectToLogin(): void {
  if (typeof window !== "undefined") {
    window.location.assign("/login");
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: Partial<ApiErrorResponse> = {};
  try {
    body = (await response.json()) as Partial<ApiErrorResponse>;
  } catch {
    body = {};
  }

  const fallback = response.statusText || "Request failed";
  return new ApiError({
    statusCode:
      typeof body.statusCode === "number" ? body.statusCode : response.status,
    error: body.error ?? fallback,
    message: body.message ?? fallback,
    path: body.path,
  });
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly tokenStore: TokenStore;
  private readonly onUnauthenticated: () => void;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_API_BASE_URL).replace(
      /\/+$/,
      "",
    );
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
    this.tokenStore = options.tokenStore ?? createTokenStore();
    this.onUnauthenticated = options.onUnauthenticated ?? redirectToLogin;
  }

  async request<T>(
    path: string,
    init: RequestInit = {},
    options: RequestOptions = {},
  ): Promise<T> {
    const allowRefresh = options.allowRefresh ?? true;
    const response = await this.send(path, init);

    if (response.status === 401 && allowRefresh) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        return this.request<T>(path, init, { allowRefresh: false });
      }

      this.tokenStore.clear();
      this.onUnauthenticated();
      throw await toApiError(response);
    }

    return this.parse<T>(response);
  }

  register(input: RegisterInput): Promise<AuthResult> {
    return this.authenticate("/auth/register", input);
  }

  login(input: LoginInput): Promise<AuthResult> {
    return this.authenticate("/auth/login", input);
  }

  async logout(): Promise<void> {
    try {
      await this.request(
        "/auth/logout",
        { method: "POST" },
        {
          allowRefresh: false,
        },
      );
    } finally {
      this.tokenStore.clear();
    }
  }

  me(): Promise<User> {
    return this.request<User>("/auth/me");
  }

  listTasks(params: ListTasksParams = {}): Promise<Paginated<Task>> {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set("page", String(params.page));
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.completed !== undefined) {
      query.set("completed", String(params.completed));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return this.request<Paginated<Task>>(`/tasks${suffix}`);
  }

  createTask(input: CreateTaskInput): Promise<Task> {
    return this.request<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  getTask(id: string): Promise<Task> {
    return this.request<Task>(`/tasks/${encodeURIComponent(id)}`);
  }

  updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
    return this.request<Task>(`/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  deleteTask(id: string): Promise<void> {
    return this.request<void>(`/tasks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  private async authenticate(
    path: string,
    input: RegisterInput | LoginInput,
  ): Promise<AuthResult> {
    const result = await this.request<AuthResult>(
      path,
      { method: "POST", body: JSON.stringify(input) },
      { allowRefresh: false },
    );
    this.tokenStore.setAccessToken(result.accessToken);
    return result;
  }

  private send(path: string, init: RequestInit): Promise<Response> {
    const headers = new Headers(init.headers);
    const token = this.tokenStore.getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (init.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    return this.fetchImpl(this.buildUrl(path), {
      ...init,
      headers,
      credentials: "include",
    });
  }

  private async parse<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return undefined as T;
    }

    if (!response.ok) {
      throw await toApiError(response);
    }

    const body = (await response.json()) as ApiSuccessResponse<T>;
    return body.data;
  }

  private refreshAccessToken(): Promise<boolean> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.performRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private async performRefresh(): Promise<boolean> {
    const response = await this.fetchImpl(this.buildUrl("/auth/refresh"), {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      return false;
    }

    const body = (await response.json()) as ApiSuccessResponse<{
      accessToken: string;
    }>;
    this.tokenStore.setAccessToken(body.data.accessToken);
    return true;
  }

  private buildUrl(path: string): string {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${this.baseUrl}${normalized}`;
  }
}

export const authTokenStore = createTokenStore();

export const apiClient = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  tokenStore: authTokenStore,
});
