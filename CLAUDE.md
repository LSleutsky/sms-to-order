# SMS-to-order

Read `docs/BUILD-PLAN.md` before doing anything. The build runs as slash commands, `/phase-0` through `/phase-5`, in order.

## Stack (fixed)

- pnpm workspace, `client/` and `server/`. Root `pnpm dev` runs both. `packageManager` pinned in root `package.json`.
- Client: Vite, React, TypeScript, Tailwind v4 via `@tailwindcss/vite`. Utilities only, no component library, no CSS past the one import. Vite proxies `/api` to the server.
- Server: Node, TypeScript, Express, better-sqlite3. No ORM. Routes under `/api`. In production it serves the built client from the same port.
- Extraction: Anthropic API through the official SDK, structured JSON output. Extraction only. The LLM never matches products.
- Docker: one multi-stage Dockerfile, one `compose.yaml`. `docker compose up --build` is the only thing a reviewer needs.
- Env: `ANTHROPIC_API_KEY`, `SEED_FIXTURES`, `PORT` (default 3000), `DB_PATH` (default `./data/app.db`).
- Lint: ESLint with Prettier, Tailwind CSS plugin.

## Constraints

Don't relitigate these; the reasoning goes in the decision log at the phase where each one lands.

- Input is SMS, mocked as `POST /api/inbound/sms`.
- LLM extracts. Code matches: exact on a part-number index and `sku`, then fuzzy on normalized description. Top 3 per line.
- Orders are never auto-placed.
- Raw message stored untouched, first, always.
- Inbound is idempotent on provider message id.
- Catalog loaded as-is with its own column names.

## Decision log

`docs/DECISIONS.md` starts as a header. Each phase command says which decisions it appends. Append them at the end of that phase, in first person, in my voice: what I chose, what I rejected, why. If it was your proposal I accepted, say so plainly. Number sequentially. Never edit an earlier entry. Never log a decision before the build reaches it. Don't log trivia.

## Stops

Stop and wait for me at these points, no exceptions:

1. `fixtures/sms/` empty: stop and ask. Never write them yourself.
2. `/phase-1` after loading: show ten rows with extracted part-number tokens, propose the column roles, wait for my confirmation.
3. `/phase-2` before the extraction prompt: show the JSON schema, ask whether `notes` is one string or a list.
4. `/phase-2` after seeding: print raw next to extracted for every fixture, wait for my corrections, adjust once.
5. `/phase-3` after matching: print the scores table, never set thresholds, wait for my cutoffs.
6. `/phase-4` start: ask whether raw text should highlight which span each line came from.

## Code standards

My standing rules, trimmed to what applies here.

- Explicit over implicit. Semantic names, never `min`, `data`, `result`.
- Comments explain why, only where the why isn't obvious. Never what.
- When importing `type` from a package, use `import { type Type } from "package"` instead of `import type { Type } from "package"`.
- `interface` and `type` declarations directly after imports.
- JSDoc on exported functions, hooks, and components only: one short description, `@param` block, `@returns {type} ...`. Nothing on internal helpers, `useEffect`, or `useCallback`. Follow: 1 line description, then whitespace before first `@param`, then whitespace before `@returns`.
- TypeScript is the data contract. Never widen a type to get past an error, no `any`, no assertions to paper over a bad data flow. Fix the flow. Provide good reason if using `unknown` type.
- Verify an API exists before using it: check the package's `.d.ts` under `node_modules`. If you can't confirm it, don't use it.
- React: functional components, `export default function`, one component per file, state at the lowest level that needs it, derived values never stored in state, server state never copied into `useState`. Every async path has loading, empty, error, and success states. Controls are labeled and keyboard operable. Reserve layout space with `min-w-*` and `min-h-*`, never placeholder characters.
- Prefer using `const` over `function` where functionally equivalent.
- Group single-line `const` declarations together, add whitespace before and after multi-line `const` declarations.
- Errors: no empty catch blocks. Expected failures are explicit states. Unexpected failures propagate. User-facing errors say what to do next.
- Rule of three: allow a second copy, extract on the third.
- No speculative flags, options, or abstractions. No phantom features: never document or validate something that isn't built.
- After every change: lint, format, typecheck. Fix what you introduced before calling it done.

## Overrides of my global rules for this repo

My global instructions ask permission before installing packages, starting dev servers, running tests, or creating files, and ask for a written plan before non-trivial work. Inside a phase command those are pre-approved: the phase command is the approved plan. Still mine and only mine: staging and commits, anything outside the current phase, and any dependency not already named in this file, the phase commands, or `csv-parse` and `tsx` (propose with the reason and wait).

## Scope discipline

- No abstractions for a single call site.
- No config layers, plugin systems, generic repositories, retry frameworks, feature flags, event buses.
- One test file, the matcher, run against the fixtures.
- No file over ~300 lines without asking.
- Out-of-scope items get one or two sentences in `docs/OUT-OF-SCOPE.md`, never a stub or TODO.

## Before saying a phase is done

`pnpm typecheck` and lint pass for both packages. `pnpm dev` starts clean. Every fixture runs through the pipeline without throwing. Decision entries for the phase are appended. Report in five lines or fewer, then stop. Never commit; I commit.

## Voice

Anything a person reads is plain first person, short sentences, no marketing words. ASCII only.
