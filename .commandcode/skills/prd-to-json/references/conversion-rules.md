# PRD conversion rules

## Task sizing

Each task must be feasible in one fresh agent context and one atomic commit. A task should have:

- one coherent outcome;
- a bounded set of files or components;
- independently verifiable acceptance criteria;
- no dependence on unstated conversational context.

Split broad work such as “add authentication,” “build the dashboard,” or “refactor the API.” Keep enabling infrastructure as a task only when it produces a verifiable result.

## IDs and ordering

- Use stable IDs in the form `TASK-NNN`, beginning with `TASK-001`.
- Never derive identity from array position or title.
- Preserve IDs across title edits and PRD revisions when intent is unchanged.
- Use the next unused number for new tasks.
- Assign positive integer priorities: `1` is highest urgency. Dependencies remain hard constraints regardless of priority.
- For equally prioritized ready tasks, document order is the execution tie-breaker.

## Dependencies

Every task has `dependsOn`, using `[]` when none exist. Dependencies must:

- refer only to existing task IDs;
- never include the task itself;
- contain no duplicates;
- form an acyclic graph;
- represent genuine implementation prerequisites, not preferred ordering.

## Branch names

Every task has its own unique branch in the form `ralph/task-nnn-short-slug`. Validate it with:

```sh
git check-ref-format --branch '<branchName>'
```

There is no top-level branch name. Base-branch and merge policy belong to the runner or human workflow.

## Acceptance criteria

Acceptance criteria must describe observable evidence. Include:

- primary behavior;
- relevant errors and edge cases;
- authorization, data, accessibility, or compatibility behavior when applicable;
- the relevant project validation checks.

Avoid vague criteria such as “works correctly,” implementation steps, and criteria that require unrelated tasks to finish.

## State

`passes` is the only persisted completion status:

- `true`: every criterion and applicable project check has passed;
- `false`: pending, ready, blocked, in progress, or failed.

Derive runtime state:

1. passed when `passes` is true;
2. blocked when any dependency is not passed;
3. ready otherwise.

Record durable success or failure evidence in `notes`. Never create a second persisted `status` field.

## Reconciliation

Compare tasks by intent and requirement coverage, not title alone. Preserve IDs, `passes`, and `notes` for unchanged tasks. If acceptance criteria materially expand a completed task, flag it for review rather than silently reverting or retaining completion. Keep removed completed tasks until a human decides how to archive them.
