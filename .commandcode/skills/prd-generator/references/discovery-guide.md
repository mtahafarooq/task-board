# Requirements discovery guide

## Inspect before asking

Read relevant repository guidance and identify:

- current product behavior and terminology;
- affected users, surfaces, services, and data;
- established architecture and compatibility constraints;
- existing test, release, migration, and observability patterns.

Do not ask questions already answered by the repository.

## How to ask

The interview is a conversation, not a form. Follow these rules:

- **Small batches.** Ask 2–4 questions at a time, highest impact first. Wait for answers before the
  next batch.
- **Why-first.** Before each question, add one plain sentence on why it matters, for example: "I
  need to know who can see this, because it decides which checks the code must do."
- **Offer choices.** When a question has a small set of sensible answers, use the `AskUserQuestion`
  tool so the person can pick instead of typing. Keep free text for genuinely open questions.
- **Plain wording.** Ask in everyday language. Do not use our internal jargon in the question — the
  person may not know it either.
- **Normalize, do not interrogate.** If the person pastes notes, a ticket, or a half-spec, extract
  the answers yourself and ask only about what is still missing.
- **Stop early.** Once the remaining gaps cannot change scope, data, permissions, or acceptance
  criteria, stop and mark the rest as open questions.

## Discover the requirement

Ask focused questions in small batches. Cover only relevant categories:

1. **Problem:** What is wrong or missing today? What evidence supports it?
2. **Outcome:** What measurable or observable result defines success?
3. **Users:** Who performs the workflow, and who is affected?
4. **Scope:** What behavior is included? What is explicitly excluded?
5. **Workflow:** What are the main path, alternate paths, and failure paths?
6. **Rules:** What validation, authorization, state, or business rules apply?
7. **Data:** What is created, read, changed, retained, migrated, or deleted?
8. **Interfaces:** Which UI, API, CLI, event, or integration contracts change?
9. **Quality:** Which security, privacy, accessibility, reliability, performance, or scale
   constraints matter?
10. **Delivery:** Are rollout, compatibility, migration, feature flags, monitoring, support, or
    rollback required?
11. **Validation:** How can each outcome be proven with automated or manual checks?

## Suggested question batches

Use these as a starting script; drop any question the repository already answers.

**Batch 1 — the core (always ask):**

- What problem does this solve, and for whom? _(Why: it sets the whole scope.)_
- How will you know it worked? _(Why: goals need to be observable.)_
- What is clearly **not** in scope? _(Why: it stops the work from creeping.)_

**Batch 2 — the workflow (usually ask):**

- Walk me through the happy path, step by step. _(Why: it becomes the main flow.)_
- What goes wrong, and what should the user see then? _(Why: it becomes the error cases.)_
- Who is allowed to do this? _(Why: it decides the permission checks.)_

**Batch 3 — the constraints (ask when the work is technical):**

- What data is created, changed, or deleted? _(Why: it drives the database work.)_
- Any stack, performance, deadline, or compatibility constraint? _(Why: it sets hard boundaries.)_
- Does this need a feature flag, migration, or rollback plan? _(Why: it affects how it ships.)_

## Classify information

Keep these categories distinct:

- **Confirmed:** directly stated or proven by repository evidence.
- **Constraint:** a mandatory boundary on the solution.
- **Assumption:** a temporary proposition requiring validation.
- **Open question:** unresolved information that may change scope or behavior.

Ask for clarification when an unresolved answer changes core behavior, data safety, permissions,
compatibility, or acceptance criteria. Do not block drafting for low-impact details; mark them
clearly.
