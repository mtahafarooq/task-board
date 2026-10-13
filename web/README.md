# Task Board Web

Next.js (App Router, TypeScript, Tailwind CSS) frontend for the task board.

## Requirements

- Node.js 22+
- The API running (locally or via `docker compose`); see the workspace README.

## Configuration

Environment variables (see `.env.example`):

| Variable              | Required | Default                          | Purpose                          |
| --------------------- | -------- | -------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_API_URL` | no       | `http://localhost:3001/api/v1`   | Base URL the browser calls       |

`NEXT_PUBLIC_*` variables are inlined at build time, so set them before `npm run build`
(or in the compose environment) for a production image.

## Run locally

```sh
npm ci
npm run dev                     # http://localhost:3000
```

## Common commands

| Command                | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Start the dev server (Turbopack)           |
| `npm run build`        | Production build (`output: "standalone"`)  |
| `npm run start`        | Serve a production build                    |
| `npm run lint`         | ESLint (flat config, `eslint-config-next`) |
| `npm run typecheck`    | `tsc --noEmit`                             |
| `npm test`             | Jest unit tests                            |
| `npm run format:check` | Prettier check                             |

## Docker

The `Dockerfile` is a multi-stage build; the runtime stage copies the Next.js
`standalone` output and runs `node server.js` as the non-root user `web` (uid/gid 1001)
on port 3000. It is wired up as the `web` service in the workspace `docker-compose.yml`.

```sh
# from the workspace root
docker compose up --build web
```

## Structure

```
src/app/          App Router routes (/ landing, /login, /register, /board)
src/app/providers.tsx  Client-side TanStack Query + AuthProvider wrapper
src/components/   Shared UI (accessible form field, task list + list view)
src/lib/api/      Typed API client (token handling + refresh on 401)
src/lib/auth/     Auth provider, session cookie, validation, redirect rules
src/middleware.ts Route protection (redirects based on the session cookie)
public/           Static assets served from the root
```

## Task board

`src/app/board` renders the authenticated user's tasks through
`src/components/TaskList.tsx`, which loads them with **TanStack Query**
(`useQuery` + the shared `apiClient`). The query is keyed by user id
(`["tasks", userId]`) so cached tasks never leak between accounts.

`src/components/TaskListView.tsx` is the presentational list and renders each of
the required states:

- **loading** — a `role="status"` message while the request is in flight;
- **error** — a `role="alert"` message with a **Try again** button that refetches;
- **empty** — a "No tasks yet" placeholder when the user has none;
- **ready** — a semantic `<ul>` of tasks (title, optional description, optional
  due date, and an Open/Completed badge).

The list is responsive (stacked on small screens, aligned row on `sm` and up) and
keyboard accessible: it uses native list/button markup with an accessible name
(`aria-label="Your tasks"`) so every control is focusable and labelled.

`src/components/TaskCreateForm.tsx` sits above the list and adds tasks. It validates a
nonempty title client-side (mirroring the API DTO via `src/lib/tasks/validation.ts`)
before submitting, shows a `role="alert"` error on failure, and on success invalidates
the tasks query so the new task appears in the list without a full page reload.

Each task row (`src/components/TaskItem.tsx`) also lets the owner manage it:

- **Toggle completion** — a labelled checkbox marks the task complete/incomplete. The
  change is applied optimistically to the cached list and rolled back with a `role="alert"`
  message if the request fails; the state survives a reload.
- **Edit** — an inline `TaskEditForm` (`src/components/TaskEditForm.tsx`, reusing the
  same validation) edits the title, description, and due date; saving invalidates the
  tasks query so the row reflects the new values.
- **Delete** — a two-step inline confirmation ("Delete this task?" → Confirm/Cancel)
  deletes the task; it then disappears from the board.

`src/lib/tasks/validation.ts` maps tasks to/from form values (`taskToFormValues`,
`toUpdateTaskInput`), and `src/lib/tasks/format.ts` formats due dates.

## API client

`src/lib/api` exports a typed `ApiClient` that speaks the API's
`{ success, statusCode, data }` envelope and returns the unwrapped `data`. It attaches
the in-memory access token as a bearer header, sends cookies (`credentials: "include"`)
so the refresh cookie reaches `/auth/refresh`, and on a `401` refreshes **once** and
retries the original request. If the refresh fails it clears the token and redirects to
`/login` (override with the `onUnauthenticated` option). Errors are thrown as `ApiError`
carrying the API's `statusCode`, `error`, and `message`(s).

The shared `apiClient` singleton reads `NEXT_PUBLIC_API_URL`; tests construct their own
`new ApiClient({ fetchImpl, tokenStore, onUnauthenticated })` to run without a network.

## Authentication

`src/lib/auth` wires registration, login, and session restoration on top of the API client:

- `AuthProvider` (`src/app/providers.tsx` wraps the app) restores the session on load by
  calling `GET /auth/me`, which transparently refreshes via the httpOnly refresh cookie, and
  exposes `useAuth()` with `user`, `status`, `login`, `register`, and `logout`.
- `src/app/login` and `src/app/register` are accessible forms: labeled inputs, inline
  `role="alert"` field errors, `aria-invalid`/`aria-describedby`, and a form-level error that
  keeps the entered email on a failed login. Validation rules mirror the API DTOs
  (`src/lib/auth/validation.ts`).
- `src/middleware.ts` redirects based on a small, readable `tb_session` cookie the app sets
  once authenticated (the API's refresh cookie is httpOnly and path-scoped to the API, so it
  cannot be read here). Unauthenticated visitors to `/board` are sent to `/login`; signed-in
  visitors to `/`, `/login`, or `/register` are sent to `/board`.

The API is expected to be reachable at `NEXT_PUBLIC_API_URL`; the browser needs the API to
allow the web origin via CORS.
