---
name: prd-to-json
description: Convert an approved Markdown PRD or specification into the structured prd.json backlog consumed by a Ralph execution loop. Use when asked to convert a PRD, create Ralph tasks, generate or validate prd.json, split requirements into atomic tasks, assign priorities and dependencies, or reconcile JSON after a PRD revision; do not invent missing product requirements.
---

# PRD to Ralph JSON

Convert approved requirements into deterministic, independently executable tasks.

## Workflow

1. Read the supplied PRD and existing `prd.json`, if present.
2. Read [the conversion rules](references/conversion-rules.md) and the canonical `prd.schema.json`.
3. Ask for clarification when unresolved requirements prevent safe decomposition. Do not fill product gaps by guessing.
4. Decompose requirements into tasks small enough for one fresh agent context and one atomic commit.
5. Write or reconcile `prd.json` using [the template](assets/prd-template.json).
6. Validate the document against `prd.schema.json`.
7. Perform semantic checks that JSON Schema cannot guarantee: unique task IDs and branch names, existing dependency references, no self-dependencies, no cycles, and Git-valid branch names.
8. Report any unresolved requirements or validation failures. Do not mark tasks complete merely because they appear in the source PRD.

## Reconciliation rules

When updating an existing backlog:

- Preserve IDs for semantically unchanged tasks.
- Preserve `passes` and `notes` for unchanged tasks.
- Never reset completed work without explicit instruction.
- Allocate new IDs without renumbering existing tasks.
- Do not silently delete completed tasks; flag removed requirements for a decision.
