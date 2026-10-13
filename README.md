# task-board

A full-stack task board: **Next.js** frontend, **NestJS** API, **PostgreSQL**, all
wired together with Docker Compose and built task by task with the Ralph loop.

The application code lives in two independent repos, created by the loop:

- `api/` — NestJS + Prisma + PostgreSQL backend
- `web/` — Next.js (App Router) frontend

This root repo only holds orchestration (compose, environment), the PRD, the Ralph
backlog, and the loop tooling.

## Layout

```
task-board/
├── api/                 # NestJS backend (created by TASK-001)
├── web/                 # Next.js frontend (created by TASK-008)
├── docker-compose.yml   # postgres + api + web (local dev)
├── .env.example         # copy to .env
├── prd.md               # product requirements
├── prd.json             # Ralph backlog
├── progress.txt         # Ralph append-only memory
├── scripts/run.sh       # single entrypoint for the loop
├── PROMPT.md            # one iteration's instructions
├── prd.schema.json      # backlog schema
├── ralph.sh             # bounded loop
├── ralph-once.sh        # one fresh iteration
└── validate-prd.sh      # backlog validator
```

## Requirements

- Docker (with Compose)
- `jq` on `PATH` (used by `ralph.sh` and `validate-prd.sh`)
- Free host ports `3000` (web), `3001` (api), and `5432` (postgres) for the compose stack

## Environment

Copy the example file and adjust as needed:

```sh
cp .env.example .env
```

| Variable              | Default                          | Used by | Purpose                                            |
| --------------------- | -------------------------------- | ------- | -------------------------------------------------- |
| `POSTGRES_USER`       | `taskboard`                      | db, api | Database user                                      |
| `POSTGRES_PASSWORD`   | `taskboard`                      | db, api | Database password                                  |
| `POSTGRES_DB`         | `taskboard`                      | db, api | Database name                                      |
| `JWT_SECRET`          | `dev-only-change-me`             | api     | Signs access tokens — set a long random value anywhere it is not purely local |
| `CORS_ORIGIN`         | `http://localhost:3000`          | api     | Browser origin allowed to call the API             |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api/v1`   | web     | Base URL the browser uses to reach the API         |

The API also accepts optional `PORT`, `JWT_REFRESH_SECRET`, and `COOKIE_SECURE`
(see `api/README.md`). It validates its environment on startup and exits with a clear
message when `DATABASE_URL` or `JWT_SECRET` is missing.

## Run the app

```sh
cp .env.example .env
docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:3001/api/v1
- Swagger UI: http://localhost:3001/api/docs

Compose starts `db` first and waits for it to be healthy, then starts `api` (which runs
`prisma migrate deploy` before booting, so migrations apply automatically), then starts
`web` once the API is healthy.

## Smoke test

Start the stack in the background and check each service:

```sh
cp .env.example .env
docker compose up --build -d
docker compose ps                                   # db, api, web all healthy
curl -s localhost:3001/api/v1/health                # {"success":true,...}
```

Register through the API and confirm a token comes back:

```sh
curl -s localhost:3001/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","name":"Me","password":"supersecret"}'
```

Then open http://localhost:3000 in a browser and walk the flow:

1. Register a new account (or log in) — you land on the board.
2. Create a task with a title (and optional description / due date).
3. Mark it complete, edit it, and delete it — the board updates in place.
4. Reload the page — you stay logged in and the board reflects your tasks.

Reset everything (including the database) with `docker compose down -v`.

## Build it with the Ralph loop

```sh
./validate-prd.sh        # schema + dependency + cycle check, must print OK
./scripts/run.sh 10      # up to 10 iterations; each is one fresh agent process
```

`ralph.sh` prints one line per iteration — the iteration out of the total and the
task it is working on — and stops when every task passes, the agent reports
`BLOCKED`/`FAILED`, `prd.json` stops changing, or the iteration limit is reached.
Full agent output per iteration is written to `.ralph/logs/iteration-N.log`.

Run a single iteration by hand with `./ralph-once.sh`.
