# Task Board API

NestJS + Prisma + PostgreSQL backend for the task board.

## Requirements

- Node.js 22+
- PostgreSQL 17 (or Docker)

## Configuration

Environment variables:

| Variable             | Required | Default              | Purpose                                             |
| -------------------- | -------- | -------------------- | --------------------------------------------------- |
| `DATABASE_URL`       | yes      | –                    | PostgreSQL connection string                        |
| `PORT`               | no       | `3001`               | HTTP port the API listens on                        |
| `JWT_SECRET`         | yes      | `dev-only-change-me` | Signs access tokens (and refresh unless overridden) |
| `JWT_REFRESH_SECRET` | no       | `JWT_SECRET`         | Signs refresh tokens                                |
| `COOKIE_SECURE`      | no       | `false`              | Set `true` to add `Secure` to the refresh cookie    |
| `CORS_ORIGIN`        | no       | `http://localhost:3000` | Browser origin allowed to call the API           |

Startup validates the environment and fails fast with a clear message when a required
variable (`DATABASE_URL`, `JWT_SECRET`) is missing or `PORT` is not a valid port, so a
misconfigured container exits immediately instead of booting half-working.

## Run locally

```sh
npm ci
cp ../.env.example ../.env      # then export DATABASE_URL from it
npx prisma generate
npm run start:dev               # http://localhost:3001/api/v1/health
                                # Swagger UI: http://localhost:3001/api/docs
```

## Common commands

| Command                   | Purpose                             |
| ------------------------- | ----------------------------------- |
| `npm run build`           | Compile to `dist/`                  |
| `npm run lint`            | ESLint over `src/` and `test/`      |
| `npm run typecheck`       | `tsc --noEmit`                      |
| `npm test`                | Unit tests (Jest)                   |
| `npm run test:e2e`        | End-to-end tests (Jest + supertest) |
| `npm run test:db`         | Migration + model tests (needs `DATABASE_URL`) |
| `npm run prisma:generate` | Regenerate the Prisma client        |
| `npm run prisma:deploy`   | Apply committed migrations          |

`npm run test:db` resets the target database (`prisma migrate reset`), reapplies every
committed migration, then runs the model specs against real PostgreSQL. It destroys the
data in `DATABASE_URL`, so point it at a throwaway database:

```sh
DATABASE_URL='postgresql://taskboard:taskboard@localhost:5432/taskboard?schema=public' \
  npm run test:db
```

## API documentation

Interactive OpenAPI/Swagger docs are served at **`/api/docs`** (raw document at
`/api/docs-json`) and describe every endpoint, its request bodies, and the shared
envelopes below. Guarded operations use bearer auth, so pass an access token from
`/auth/login` in the **Authorize** dialog to call them from the UI.

## Response format

Every response uses one of two envelopes. Successful responses (`2xx`) wrap the payload:

```json
{ "success": true, "statusCode": 200, "data": { } }
```

Errors share a single shape, produced by the global exception filter:

```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["title must be longer than or equal to 1 characters"],
  "path": "/api/v1/tasks"
}
```

`message` is a string for most errors and an array of messages for validation failures.
`204 No Content` responses have no body. The health payload, auth responses, and the
paginated task list (`data.data` + `data.meta`) all live inside `data`.

## Data model

`prisma/schema.prisma` defines two models:

- `User` — `id` uuid, unique `email`, `name`, `passwordHash`, `createdAt`, `updatedAt`.
- `Task` — `id` uuid, `title`, optional `description`, optional `dueDate`, `completed`
  (default `false`), `ownerId`, `createdAt`, `updatedAt`. Each task belongs to one `User`
  via `ownerId`; deleting the user cascades to their tasks. Composite indexes
  `(ownerId, completed)` and `(ownerId, createdAt)` support listing a user's tasks and
  filtering by completion state.

Migrations live in `prisma/migrations/` and are applied on container start by
`prisma migrate deploy`.

## Authentication

Email + password auth with bcrypt (cost 12), a short-lived JWT access token, and a
refresh token in an httpOnly cookie. Passwords and hashes are never returned.

| Method | Path             | Auth   | Purpose                                    |
| ------ | ---------------- | ------ | ------------------------------------------ |
| POST   | `/auth/register` | –      | Create an account, return user + tokens     |
| POST   | `/auth/login`    | –      | Authenticate, return access token + cookie  |
| POST   | `/auth/refresh`  | cookie | Issue a new access token                    |
| POST   | `/auth/logout`   | –      | Clear the refresh cookie                    |
| GET    | `/auth/me`       | Bearer | Current user profile                        |

Register and login return `{ user, accessToken }` inside `data` and set a `refresh_token` cookie
(`httpOnly`, `path=/api/v1/auth`, 7-day expiry). Invalid credentials return `401`
with the same message whether the email or the password was wrong.

Protected routes use the reusable `AuthGuard` (verifies the bearer access token and
attaches `{ id, email }` to the request) plus the `@CurrentUser()` decorator to read the
authenticated user. `AuthModule` exports both, so other feature modules can guard their
own controllers:

```ts
@UseGuards(AuthGuard)
@Get()
list(@CurrentUser() user: AuthenticatedUser) {
  return this.tasks.listForUser(user.id);
}
```

```sh
curl -s localhost:3001/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","name":"Me","password":"supersecret"}'
```

## Tasks

Every task endpoint is guarded by `AuthGuard` and scoped to the authenticated user:
a task can only ever be read, updated, or deleted by its owner. A request for another
user's task returns `404` (existence is not disclosed).

| Method | Path          | Auth   | Purpose                                        |
| ------ | ------------- | ------ | ---------------------------------------------- |
| POST   | `/tasks`      | Bearer | Create a task for the current user              |
| GET    | `/tasks`      | Bearer | List the current user's tasks (paginated)       |
| GET    | `/tasks/:id`  | Bearer | Read one owned task                             |
| PATCH  | `/tasks/:id`  | Bearer | Update an owned task                            |
| DELETE | `/tasks/:id`  | Bearer | Delete an owned task (`204`)                    |

`GET /tasks` accepts `page` (default `1`), `limit` (default `20`, max `100`), and
`completed` (`true`/`false`) query parameters, and returns a paginated payload
(the response `data` field holds the list plus its metadata):

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "data": [{ "id": "…", "title": "…", "completed": false, "ownerId": "…" }],
    "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  }
}
```

Create and update bodies accept a required `title` plus optional `description`, `dueDate`
(ISO-8601), and `completed`. Invalid input returns a structured `400`:

```sh
curl -s localhost:3001/api/v1/tasks \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"title":"Write the report","dueDate":"2030-01-02T03:04:05.000Z"}'
```

## CORS

The browser calls the API cross-origin (the web app is served from a different port),
so the API enables CORS for a single origin taken from `CORS_ORIGIN` (default
`http://localhost:3000`) **with credentials** enabled, which is required for the
httpOnly `refresh_token` cookie to reach `/auth/refresh`. Set `CORS_ORIGIN` to the
origin the web app is served from (e.g. `https://board.example.com`) and keep the
response origin exact — a wildcard would be rejected alongside credentials.

## Docker

The image is a multi-stage build that runs as a non-root user (`api`). From the
workspace root:

```sh
docker compose up --build db api
curl -s localhost:3001/api/v1/health
```
