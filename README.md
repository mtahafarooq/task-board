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

## Run the app

```sh
cp .env.example .env
docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:3001/api/v1

Migrations run automatically when the API container starts.

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

## Smoke test

```sh
docker compose up --build -d
curl -s localhost:3001/api/v1/health
```

Then open http://localhost:3000, register a user, log in, and create / toggle /
edit / delete a task. Reset with `docker compose down -v`.
