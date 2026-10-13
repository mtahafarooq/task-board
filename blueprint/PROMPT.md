# Ralph single-iteration protocol

You are running one fresh Ralph iteration in the host project. Complete at most one task.

## Workspace layout

- The workspace root is a single git repo. It tracks the loop tooling (`scripts/`, `blueprint/`), archived runs (`archives/`), the compose files, documentation, and the application source. During a run it also tracks `prd.json` and `progress.txt`.
- Backend code lives in `api/` (NestJS + Prisma + PostgreSQL) and frontend code lives in `web/` (Next.js). Both are ordinary directories in this repo, not separate git repos.
- One repo, one commit: stage only the files the selected task touches, together with the task's `prd.json` and `progress.txt` updates.

## Read first

1. Read `prd.json`, `progress.txt`, recent Git history, and relevant repository guidance such as `AGENTS.md`, `CONTRIBUTING.md`, manifests, and test configuration.
2. Do not assume a package manager or validation command. Discover the project's established commands.
3. Treat `progress.txt` as append-only durable memory. Never edit or remove old entries.

## Select one task

A task is ready when `passes` is `false` and every ID in `dependsOn` refers to a task whose `passes` is `true`.

Choose exactly one ready task by:

1. lowest numeric `priority`;
2. document order as the tie-breaker.

If every task passes, verify that fact from `prd.json`, output `<promise>COMPLETE</promise>`, and stop without changing files.

If incomplete tasks exist but none is ready, output `<ralph>BLOCKED:no-ready-task</ralph>` and stop.

## Work safely

1. Check the working tree before editing. Never reset, clean, force-checkout, overwrite, or stage unrelated pre-existing changes.
2. Create or switch to the selected task's `branchName` only when doing so is safe. If it is unsafe, output `<ralph>BLOCKED:unsafe-working-tree-or-branch</ralph>` and stop.
3. Implement only the selected task. Do not perform opportunistic refactors or unrelated fixes.
4. Verify every acceptance criterion and run the relevant tests, type checks, lint checks, or builds established by this project. Never claim a check ran when it did not.

## Persist the result

On success:

1. Set only the selected task's `passes` to `true` and add concise durable evidence to its `notes`.
2. Append a progress entry to `progress.txt` containing the UTC timestamp, task ID/title/branch, summary, important files, validation commands and results, remaining concerns, and commit hash when available.
3. Create one atomic commit in the target repo containing only the task-related changes, plus a root commit for the PRD and progress updates.
4. Output `<ralph>ITERATION_COMPLETE:TASK-ID</ralph>`, replacing `TASK-ID` with the selected ID.
5. If all tasks now pass, also output `<promise>COMPLETE</promise>`.

On failure:

1. Keep `passes` as `false`.
2. Append actionable failure and validation context to the task's `notes` and `progress.txt` when it is safe to do so.
3. Do not create a success commit.
4. Output `<ralph>FAILED:TASK-ID</ralph>` and stop.

Do not perform another task in this invocation.
