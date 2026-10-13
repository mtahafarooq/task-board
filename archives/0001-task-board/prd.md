# Task Board — Product Requirements

## Overview

A small, production-shaped task board. Users create an account, log in, and manage
their own tasks (create, list, edit, complete, delete). The app is split into a
Next.js frontend and a NestJS API, both containerized, with PostgreSQL for storage.

## Goals

- Register and authenticate users with email and password.
- Let each authenticated user manage a private list of tasks.
- Ship the whole stack with one `docker compose up`.
- Keep the surface small enough to build and verify task by task with the Ralph loop.

## Non-goals

- Teams, sharing, or collaboration.
- Realtime updates, notifications, or reminders.
- File attachments, comments, or subtasks.
- Roles/permissions beyond "an authenticated user owns their tasks".
- Social login or password reset (may be added later).

## Personas

- **Individual user** — wants a private, low-friction place to track their own tasks.

## User stories

1. As a visitor, I can register with my name, email, and password.
2. As a registered user, I can log in and stay logged in across reloads.
3. As a logged-in user, I can create a task with a title (and optional details).
4. As a logged-in user, I can see my tasks and their completion state.
5. As a logged-in user, I can mark a task complete or incomplete.
6. As a logged-in user, I can edit a task's title, details, or due date.
7. As a logged-in user, I can delete a task.
8. As a logged-in user, I cannot see or affect another user's tasks.

## Functional requirements

### Authentication

- Registration stores a unique email, a display name, and a bcrypt password hash.
- Login returns a short-lived JWT access token and sets a refresh token in an
  httpOnly cookie.
- `POST /auth/refresh` issues a new access token from a valid refresh cookie.
- `GET /auth/me` returns the authenticated user's profile.
- Invalid credentials return `401` without revealing which field was wrong.
- Passwords and hashes are never returned in any response.

### Task management

- A task has a title, optional description, optional due date, completion state,
  an owner, and timestamps.
- Authenticated users can create, list, read, update, and delete **their own** tasks.
- Accessing another user's task returns `404` (existence is not leaked).
- The list endpoint supports pagination and filtering by completion state.
- Deleting a user removes their tasks (cascade).

## Non-functional requirements

- **Security** — bcrypt hashing (cost 12); JWT with short access TTL; refresh token
  in an httpOnly cookie; CORS scoped to the web origin; input validated at the edge.
- **Accessibility** — labeled form fields, inline validation errors, visible focus,
  and keyboard-operable controls.
- **Containers** — one multi-stage Dockerfile per service, non-root runtime, and a
  single `docker compose up` for the whole stack with database health gating.
- **Consistency** — one response envelope for success and one error shape.
- **Documentation** — Swagger for the API, READMEs for each repo and the workspace.

## Data model

```
User  id, email (unique), name, passwordHash, createdAt, updatedAt
Task  id, title, description?, dueDate?, completed, ownerId -> User, createdAt, updatedAt
```

## API contract

Base path: `/api/v1`

| Method | Path            | Auth   | Purpose                                   |
|--------|-----------------|--------|-------------------------------------------|
| POST   | `/auth/register`| –      | Create account, return user + tokens      |
| POST   | `/auth/login`   | –      | Authenticate, return access token + cookie|
| POST   | `/auth/refresh` | cookie | Issue a new access token                  |
| POST   | `/auth/logout`  | –      | Clear the refresh cookie                  |
| GET    | `/auth/me`      | Bearer | Current user profile                      |
| GET    | `/health`       | –      | Liveness check                            |
| GET    | `/tasks`        | Bearer | Paginated list of own tasks               |
| POST   | `/tasks`        | Bearer | Create a task                             |
| GET    | `/tasks/:id`    | Bearer | Read one own task                         |
| PATCH  | `/tasks/:id`    | Bearer | Update one own task                       |
| DELETE | `/tasks/:id`    | Bearer | Delete one own task                       |

## Acceptance summary

- A first-time user can register, log in, and manage their tasks entirely through
  the browser against the compose stack.
- Ownership is enforced for every task operation.
- All repositories pass their own lint, type-check, test, and build commands.
