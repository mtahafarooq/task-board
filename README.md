# task-board

A full-stack task board: **Next.js** frontend, **NestJS** API, **PostgreSQL**, all
wired together with Docker Compose and built task by task with the Ralph loop.

The application code lives in this same repo:

- `api/` — NestJS + Prisma + PostgreSQL backend
- `web/` — Next.js (App Router) frontend

A single clone runs the whole stack. The root also holds orchestration (compose,
environment), the Ralph loop tooling, its reusable blueprint, and one archived
directory per completed feature run.

## Layout

```
task-board/
├── api/                 # NestJS backend (created by TASK-001)
├── web/                 # Next.js frontend (created by TASK-008)
├── docker-compose.yml   # postgres + api + web (local dev)
├── .env.example         # copy to .env
├── blueprint/           # reusable engine for every run
│   ├── PROMPT.md        # one iteration's instructions
│   ├── prd.schema.json  # backlog schema
│   └── progress.txt     # empty append-only memory template
├── scripts/             # the loop tooling
│   ├── ralph.sh         # bounded loop
│   ├── ralph-once.sh    # one fresh iteration
│   └── validate-prd.sh  # backlog validator
├── archives/            # one directory per completed feature run
│   └── 0001-task-board/
│       ├── prd.md       # approved product requirements
│       ├── prd.json     # the executed Ralph backlog
│       └── progress.txt # the run's append-only memory
├── prd.json             # created per run, archived when the run completes
└── progress.txt         # created per run, archived when the run completes
```

## Requirements

- Docker (with Compose)
- `jq` on `PATH` (used by `scripts/ralph.sh` and `scripts/validate-prd.sh`)
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

Each feature is one run: write the PRD, convert it to a backlog, run the loop, then
archive the three run files. `PROMPT.md`, `prd.schema.json`, and an empty
`progress.txt` live in `blueprint/` and are reused for every run.

```sh
# 1. Write the PRD and its backlog (skills ship in .commandcode/skills/)
/prd-generator                            # -> prd.md
/prd-to-json                              # -> prd.json
cp blueprint/progress.txt progress.txt    # fresh append-only memory for this run

# 2. Validate and run
./scripts/validate-prd.sh                 # schema + dependency + cycle check, must print OK
./scripts/ralph.sh 10                     # up to 10 iterations; each is one fresh agent process

# 3. Archive the finished run
mkdir -p archives/0002-<feature>
git mv prd.md prd.json progress.txt archives/0002-<feature>/
```

`scripts/ralph.sh` prints one line per iteration — the iteration out of the total and the
task it is working on — and stops when every task passes, the agent reports
`BLOCKED`/`FAILED`, `prd.json` stops changing, or the iteration limit is reached.
Full agent output per iteration is written to `.ralph/logs/iteration-N.log`.

`scripts/ralph-once.sh` reads one iteration's instructions from `blueprint/PROMPT.md`.
Run a single iteration by hand with `./scripts/ralph-once.sh`.
