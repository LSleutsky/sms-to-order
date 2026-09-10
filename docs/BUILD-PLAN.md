# Build plan

Written before any code.

## What I'm building

SMS-to-order for the counter. A contractor texts an order to the branch. The system stores the text, pulls out line items, matches each against the product catalog with a confidence score, and puts it in a review queue. A counter person confirms the matches, fixes the ones the system wasn't sure about, and accepts the order. Nothing becomes an order without a person.

## Pipeline

    inbound text -> store raw -> extract lines (LLM) -> match to catalog (code) -> review queue (UI) -> order

Two rules shape everything: the LLM only extracts, never matches. Raw text is stored untouched before anything else happens.

## Stack

pnpm workspace, Vite + React + TypeScript + Tailwind client, Express + TypeScript + SQLite server, Anthropic API for extraction with a JSON schema. No ORM, no auth, no component library. One Dockerfile and a compose file so it runs with `docker compose up --build` and nothing else installed.

## How I'm running the build

Claude Code, driven by `CLAUDE.md` and one slash command per phase. Stops where I read output and decide: the catalog column roles, the extraction schema, the extraction results, the match cutoffs, one UI scope question. Fixtures hand-written before the parser exists. Decisions logged in `DECISIONS.md` as they get made.

## Phases

0. Scaffold. Workspace, both packages, Docker, health endpoint, both run paths proven.
1. Catalog. Onsemble's sample loaded as-is. Part-number index. Search endpoint.
2. Inbound and extraction. Idempotent endpoint, raw storage, LLM extraction, seed script, unparsed as a state.
3. Matching. Exact on the index, fuzzy on normalized descriptions, top 3, scores table, cutoffs from reading it.
4. Review UI. Queue and detail, resolve lines, accept.
5. Wrap. Clean Docker run, README, out-of-scope notes, how I built it.

## Out of scope

Auth, multi-tenant, real deployment, real SMS provider, async extraction, observability. Notes in `docs/OUT-OF-SCOPE.md`, no stubs in code.

## If it runs long

Cut in order: search box, notes field, quantity editing, retry button. Never cut: raw storage, dedupe, scores table, Docker run, decision log.
