# Plain-language rules

Goal: a junior developer on their first day reads the PRD once and can build from it without asking
anyone a question. Assume the reader has **zero** prior context — no knowledge of this product, this
team, or our private vocabulary.

## Sentences and words

- One idea per sentence. Aim for 20 words or fewer.
- Active voice, present tense. Write "The server sends an email," not "an email will be sent."
- Talk to the reader as "you." Write "You can reset your password," not "the user is able to…".
- Define each technical term the first time you use it. Format: **term** — plain definition.
- Expand every acronym on first use; after that you may use the short form: "two-factor
  authentication (2FA)."
- Prefer the everyday word: `use` not `utilize`, `start` not `initiate`, `show` not `render` (unless
  rendering is the actual technical point).

## Replace vague words with numbers or steps

| Vague (banned alone)       | Write instead                                                     |
| -------------------------- | ----------------------------------------------------------------- |
| fast, quick, performant    | a number: "returns within 200 ms for 10,000 rows"                 |
| easy, intuitive, friendly  | the exact steps the user takes                                    |
| handle errors              | which errors, and what the user sees                              |
| secure                     | the specific control: "passwords stored as bcrypt hashes"         |
| scalable                   | how many: "handles 1,000 requests per second per instance"        |
| simple, nice, modern (UI)  | the design system, or the exact behavior                          |

If you cannot attach a number or a concrete behavior, you are not ready to write the requirement —
mark it as an open question.

## Make it concrete

- Give a short **analogy** for anything non-obvious: "Think of the cache like a notepad on the desk —
  fast to read, thrown away when the power goes out."
- Give one worked **Example** per functional requirement: a specific input and the exact result.
- Add a **"What this means"** line after each requirement: one sentence that translates it into
  everyday words.
- Prefer a small table to a paragraph when comparing options or listing fields.
- Use the names the product already uses. When a term changes, change it everywhere.

## Diagrams

Every PRD includes a **How It Works** diagram: a Mermaid flowchart **and** an ASCII fallback (some
readers and terminals cannot render Mermaid). Keep it to the main path and its branches — a reader
should grasp the flow in ten seconds.

## Do not

- Do not use a term before defining it.
- Do not stack acronyms.
- Do not bury a decision in a long paragraph — make it a bullet.
- Do not write "various," "etc.," "as needed," or "TBD" without a matching open question.

## Self-test (run before presenting)

1. Would a developer who has never seen this project understand every sentence?
2. Is every technical term either common knowledge or defined in the Glossary?
3. Can each acceptance criterion be checked with a yes/no observation?
4. Is any adjective describing a quantity left without a number?

If any answer is "no," fix the draft before presenting it.
