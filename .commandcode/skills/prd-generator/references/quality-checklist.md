# PRD quality checklist

Before finalizing, confirm every item below.

## Content

- The problem, target users, and desired outcome are clear.
- Goals describe outcomes; non-goals establish boundaries.
- Scope does not hide unrelated work.
- Terms are consistent and ambiguous words are defined.
- Each requirement has a stable ID and observable behavior.
- Acceptance criteria are specific, testable, and include meaningful failure or edge cases.
- Requirements do not dictate implementation without a genuine constraint.
- Dependencies, constraints, risks, and compatibility implications are visible.
- Relevant security, privacy, accessibility, reliability, performance, and data-lifecycle concerns
  are addressed.
- Migration, rollout, monitoring, rollback, and support expectations are covered when needed.
- Assumptions and open questions are not presented as facts.
- The testing section explains how success will be demonstrated.
- A reader can determine what "done" means without private conversational context.

## Plain language (the reader is a junior developer on day one)

- Every sentence is short (20 words or fewer) and holds one idea.
- Every technical term is defined on first use, and the Glossary covers all jargon.
- No acronym is used before it is expanded.
- No vague adjective stands alone — `fast`, `easy`, `secure`, and `scalable` each carry a number or a
  concrete behavior.
- Every functional requirement has a **What this means** line and a worked **Example**.
- The **How It Works** diagram appears as both Mermaid and ASCII.
- The **In one paragraph** summary is understandable on its own, with no jargon.
- Acceptance criteria are a bullet list under `#### Acceptance Criteria`, in the checkbox form.
- Nothing is marked `TBD`, `etc.`, or `as needed` without a matching Open Question.

## Self-test

Read the PRD as if you had never seen the project. Could you build it without asking anyone a
question? If not, fix the draft before presenting it.
