import type { TokenStore } from ".";
import { ApiClient, ApiError, createTokenStore } from ".";

const BASE = "http://api.test/api/v1";

type FetchMock = jest.MockedFunction<typeof fetch>;

const user = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada Lovelace",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const task = {
  id: "task-1",
  title: "Write the report",
  description: null,
  dueDate: null,
  completed: false,
  ownerId: user.id,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function success(data: unknown, statusCode = 200): Response {
  return new Response(JSON.stringify({ success: true, statusCode, data }), {
    status: statusCode,
    headers: { "Content-Type": "application/json" },
  });
}

function failure(
  statusCode: number,
  message: string | string[] = "Request failed",
  error = "Error",
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      statusCode,
      error,
      message,
      path: "/api/v1/tasks",
    }),
    {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    },
  );
}

function noContent(): Response {
  return new Response(null, { status: 204 });
}

interface TestContext {
  client: ApiClient;
  fetchImpl: FetchMock;
  tokenStore: TokenStore;
  onUnauthenticated: jest.Mock;
}

function setup(): TestContext {
  const fetchImpl: FetchMock = jest.fn();
  const tokenStore = createTokenStore();
  const onUnauthenticated = jest.fn();
  const client = new ApiClient({
    baseUrl: BASE,
    fetchImpl,
    tokenStore,
    onUnauthenticated,
  });
  return { client, fetchImpl, tokenStore, onUnauthenticated };
}

function authHeader(init: RequestInit | undefined): string | null {
  return new Headers(init?.headers).get("Authorization");
}

describe("ApiClient", () => {
  it("attaches the bearer token, credentials, and parses the envelope", async () => {
    const { client, fetchImpl, tokenStore } = setup();
    tokenStore.setAccessToken("tok-1");
    fetchImpl.mockResolvedValueOnce(success(user));

    const result = await client.me();

    expect(result).toEqual(user);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`${BASE}/auth/me`);
    expect(authHeader(init)).toBe("Bearer tok-1");
    expect(init?.credentials).toBe("include");
  });

  it("omits the authorization header when no token is present", async () => {
    const { client, fetchImpl } = setup();
    fetchImpl.mockResolvedValueOnce(success(user));

    await client.me();

    const [, init] = fetchImpl.mock.calls[0];
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
  });

  it("refreshes once on 401 and retries the original request with the new token", async () => {
    const { client, fetchImpl, tokenStore } = setup();
    tokenStore.setAccessToken("tok-1");
    fetchImpl
      .mockResolvedValueOnce(failure(401, "Invalid access token"))
      .mockResolvedValueOnce(success({ accessToken: "tok-2" }))
      .mockResolvedValueOnce(success(task));

    const result = await client.getTask("task-1");

    expect(result).toEqual(task);
    expect(fetchImpl).toHaveBeenCalledTimes(3);

    const [refreshUrl, refreshInit] = fetchImpl.mock.calls[1];
    expect(refreshUrl).toBe(`${BASE}/auth/refresh`);
    expect(refreshInit?.method).toBe("POST");
    expect(authHeader(refreshInit)).toBeNull();

    const [retryUrl, retryInit] = fetchImpl.mock.calls[2];
    expect(retryUrl).toBe(`${BASE}/tasks/task-1`);
    expect(authHeader(retryInit)).toBe("Bearer tok-2");
    expect(tokenStore.getAccessToken()).toBe("tok-2");
  });

  it("does not refresh a second time when the retried request is also 401", async () => {
    const { client, fetchImpl } = setup();
    fetchImpl
      .mockResolvedValueOnce(failure(401))
      .mockResolvedValueOnce(success({ accessToken: "tok-2" }))
      .mockResolvedValueOnce(failure(401));

    await expect(client.getTask("task-1")).rejects.toBeInstanceOf(ApiError);

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    const refreshCalls = fetchImpl.mock.calls.filter(([input]) =>
      String(input).endsWith("/auth/refresh"),
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it("clears auth and redirects to login when the refresh fails", async () => {
    const { client, fetchImpl, tokenStore, onUnauthenticated } = setup();
    tokenStore.setAccessToken("stale");
    fetchImpl
      .mockResolvedValueOnce(failure(401, "Invalid access token"))
      .mockResolvedValueOnce(failure(401, "Invalid refresh token"));

    await expect(client.getTask("task-1")).rejects.toBeInstanceOf(ApiError);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(tokenStore.getAccessToken()).toBeNull();
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
  });

  it("shares a single refresh across concurrent 401 responses", async () => {
    const { client, fetchImpl } = setup();
    let refreshCount = 0;
    const seen = new Map<string, number>();
    fetchImpl.mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh")) {
        refreshCount += 1;
        return success({ accessToken: "tok-2" });
      }
      const count = (seen.get(url) ?? 0) + 1;
      seen.set(url, count);
      return count === 1
        ? failure(401)
        : success({ ...task, id: url.split("/").pop() ?? "task" });
    });

    await Promise.all([client.getTask("a"), client.getTask("b")]);

    expect(refreshCount).toBe(1);
  });

  it("throws a structured ApiError for a failed request without refreshing", async () => {
    const { client, fetchImpl } = setup();
    fetchImpl.mockResolvedValueOnce(
      failure(
        400,
        ["title must be longer than or equal to 1 characters"],
        "Bad Request",
      ),
    );

    try {
      await client.createTask({ title: "" });
      throw new Error("expected the request to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.statusCode).toBe(400);
      expect(apiError.messages).toEqual([
        "title must be longer than or equal to 1 characters",
      ]);
    }

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does not refresh on a failed login so bad credentials surface to the caller", async () => {
    const { client, fetchImpl, onUnauthenticated } = setup();
    fetchImpl.mockResolvedValueOnce(
      failure(401, "Invalid email or password", "Unauthorized"),
    );

    await expect(
      client.login({ email: "ada@example.com", password: "wrong" }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(onUnauthenticated).not.toHaveBeenCalled();
  });

  it("stores the access token after a successful login", async () => {
    const { client, fetchImpl, tokenStore } = setup();
    fetchImpl.mockResolvedValueOnce(
      success({ user, accessToken: "tok-9" }, 200),
    );

    const result = await client.login({
      email: "ada@example.com",
      password: "supersecret",
    });

    expect(result).toEqual({ user, accessToken: "tok-9" });
    expect(tokenStore.getAccessToken()).toBe("tok-9");
  });

  it("serializes task input and encodes list filters", async () => {
    const { client, fetchImpl } = setup();
    fetchImpl.mockResolvedValueOnce(success(task, 201));
    await client.createTask({ title: "Write the report" });

    const [createUrl, createInit] = fetchImpl.mock.calls[0];
    expect(createUrl).toBe(`${BASE}/tasks`);
    expect(createInit?.method).toBe("POST");
    expect(new Headers(createInit?.headers).get("Content-Type")).toBe(
      "application/json",
    );
    expect(JSON.parse(String(createInit?.body))).toEqual({
      title: "Write the report",
    });

    fetchImpl.mockResolvedValueOnce(
      success({
        data: [task],
        meta: { page: 2, limit: 5, total: 6, totalPages: 2 },
      }),
    );
    await client.listTasks({ page: 2, limit: 5, completed: false });

    const [listUrl] = fetchImpl.mock.calls[1];
    expect(listUrl).toBe(`${BASE}/tasks?page=2&limit=5&completed=false`);
  });

  it("returns undefined for a 204 response", async () => {
    const { client, fetchImpl } = setup();
    fetchImpl.mockResolvedValueOnce(noContent());

    await expect(client.deleteTask("task-1")).resolves.toBeUndefined();
  });

  it("redirects to /login by default when the refresh fails", async () => {
    const globalWithWindow = globalThis as unknown as {
      window?: { location: { assign: (url: string) => void } };
    };
    const originalWindow = globalWithWindow.window;
    const assign = jest.fn();
    globalWithWindow.window = { location: { assign } };

    try {
      const fetchImpl: FetchMock = jest.fn();
      const tokenStore = createTokenStore();
      tokenStore.setAccessToken("stale");
      const client = new ApiClient({ baseUrl: BASE, fetchImpl, tokenStore });
      fetchImpl
        .mockResolvedValueOnce(failure(401))
        .mockResolvedValueOnce(failure(401));

      await expect(client.me()).rejects.toBeInstanceOf(ApiError);

      expect(assign).toHaveBeenCalledWith("/login");
    } finally {
      globalWithWindow.window = originalWindow;
    }
  });
});
