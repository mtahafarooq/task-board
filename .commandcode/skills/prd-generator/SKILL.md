---
name: prd-generator
description: Turn an idea, feature request, or rough spec into a clear, plain-language Product Requirements Document (PRD) a junior developer can build from. Interviews you with focused questions, then writes prd.md with a glossary, a diagram, and testable acceptance criteria. Use when asked to create, write, or improve a PRD, define requirements, plan a feature, or scope acceptance criteria; do not use to implement approved requirements or convert them to Ralph JSON.
model: claude-opus-5-5
effort: max
metadata:
  version: "2.0"
---

# PRD Generator

Write a PRD that answers the questions a buyer, a designer, and a brand-new developer all have — in
language a **junior developer on their first day** can read once and act on.

One rule governs everything below: **a reader with no prior context should be able to build the thing
from this document alone, without asking anyone a question.**

## Workflow

Run these phases in order. Do not skip the interview.

### 1. Inspect before you ask

Read the repository first: `README`, `docs/`, any existing PRD (`prd.md`), architecture notes,
manifests (`package.json`, `pyproject.toml`, `go.mod`, …), and the current behavior of anything
relevant. Note the project's own vocabulary and conventions.

Never ask a question the repository already answers. If you cannot find something, ask.

### 2. Interview in small batches

Read [the discovery guide](references/discovery-guide.md). It defines what to discover and how to ask.
In short:

- Ask **2–4 questions at a time**, highest-impact first. Never dump fifteen questions at once.
- Prefix each question with a one-line, plain-English **why this matters**.
- When a question has a small set of sensible answers, use the `AskUserQuestion` tool so the person
  can pick instead of typing. Reserve free text for genuinely open questions.
- Accept messy input — meeting notes, a ticket, a half-written spec — and normalize it into the
  template yourself. Do not make the person reformat their own notes.
- Sort every fact into one of four buckets and label it in the PRD:
  **Confirmed** (stated or proven), **Constraint** (a hard boundary),
  **Assumption** (a guess to validate), **Open question** (unresolved).
- Keep interviewing only until unresolved answers would change scope, data, permissions, or
  acceptance criteria. Mark low-impact gaps as open questions instead of blocking.

### 3. Draft in plain language

Apply [the plain-language rules](references/plain-language-rules.md) as you write — not as a cleanup
pass at the end. The audience is a junior developer on day one, and every technical term must be
defined.

### 4. Use the template

Write the PRD with [the template](assets/prd-template.md). See [the worked example](assets/prd-example.md)
for the target style and length. Default to `prd.md` unless another path is requested.

### 5. Self-review, then present

Run [the quality checklist](references/quality-checklist.md) against your draft. Fix what fails and
iterate before presenting the PRD.

### 6. Hand off

- Never overwrite an existing `prd.md` without confirmation. When one exists, propose a revision.
- Stop after the human-readable PRD. Recommend `prd-to-json` only **after** the PRD is approved.

## Hard rules

- **Plain language first.** Short sentences, active voice, one idea each. Define every term; expand
  every acronym on first use; never leave a vague adjective without a number. See the rules file.
- **Keep the anchors downstream tools read.** Requirement headings stay `### REQ-00N: <Title>`, and
  acceptance criteria stay a bullet list under `#### Acceptance Criteria`. `prd-to-json` depends on
  this shape.
- **Describe outcomes, not implementation.** Say what the user can do and observe. Prescribe
  implementation only when it is a genuine constraint (for example, "must run on the existing
  PostgreSQL database").
- **Every acceptance criterion is independently verifiable.** State the observable result, plus the
  relevant error and edge cases. "Works correctly" is banned.
- **Stable IDs.** `REQ-###` IDs survive later edits; never renumber an existing requirement.
- **Explicit non-goals.** Name what you are not building, so scope stays under control.
- **Never present an assumption as confirmed.** If you guessed it, label it.
- **Cover the boring sections** (security, privacy, accessibility, performance, data, migration,
  rollout, observability) — or mark a category "not applicable" with a one-line reason.
