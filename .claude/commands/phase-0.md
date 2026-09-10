Read `CLAUDE.md` and `docs/BUILD-PLAN.md` in full.

Scaffold:
- pnpm workspace: `pnpm-workspace.yaml`; root `package.json` with `packageManager` pinned to the installed pnpm version and scripts `dev` (both packages in parallel), `build`, `start`, `typecheck`, `lint`, `seed`.
- `client/`: Vite, React, TypeScript, Tailwind v4 via `@tailwindcss/vite` with one `@import "tailwindcss"` stylesheet. Vite proxies `/api` to `http://localhost:3000`.
- Bootstrap an ESLint and Prettier config, with `eslint.config.js` and `.prettierrc`, respectively. Use recommended configs from `eslint-config-prettier` and `eslint-plugin-prettier`. Add linting for Tailwind via `eslint-plugin-tailwindcss`. Add additional linting rules for prop ordering, prefer brackets for conditional expressions and loops.
- `server/`: Express, TypeScript, better-sqlite3, Anthropic SDK. `tsx` for dev, `tsc` for build. Reads `PORT` and `DB_PATH` from env. `GET /api/health` returns `{ ok: true, extraction: "ready" | "no_api_key" }`. In production, serves `client/dist` static on the same port with a fallback to `index.html`.
- `Dockerfile`, multi-stage on `node:22-bookworm-slim`. Build stage: `corepack enable`, `--frozen-lockfile`, build both packages, include `python3 make g++` so `better-sqlite3` compiles if no prebuilt binary matches. Runtime stage: production deps only, built output, non-root user, `/app/data` owned by that user, `HEALTHCHECK` on `/api/health`, `CMD` runs the server.
- `compose.yaml`: service `app`, `build: .`, `env_file: .env`, `ports: "${PORT:-3000}:3000"`, named volume at `/app/data`, `DB_PATH=/app/data/app.db`, `restart: unless-stopped`.
- `fixtures/sms/`, `docs/OUT-OF-SCOPE.md` empty.

Verify: `pnpm dev` serves health through the Vite proxy. `docker compose up --build` serves it on 3000 with the healthcheck green. Both must pass.

Append decision entries: the feature choice (SMS-to-order, shop side, over the photo and recommender feature); Express + SQLite; pnpm over npm; Docker Compose as the run path with one container; Tailwind for styling. Then report and stop.
