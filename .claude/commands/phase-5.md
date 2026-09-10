Wrap. Four things, then stop, no further code changes.

1. `docker compose down -v` then `docker compose up --build`. Healthcheck green, queue seeded, full flow works at `localhost:3000`. Fix only what's broken.

2. `README.md` under 70 lines, plain first person. Run section first: Docker (`cp .env.example .env`, add the key, `docker compose up --build`, open 3000), then pnpm, then what happens with no key. Then what it is, what's in the fixtures, one paragraph on the pipeline, one on the sample catalog: loaded as-is, part numbers indexed out of descriptions, price and quantity columns shown but not built on.

3. `docs/OUT-OF-SCOPE.md`: auth; multi-tenant (`hajoca_profit_center` is already in the data and is the tenant key); real deployment; real SMS provider; async extraction; observability; scaling; plus anything logged out of scope during the build. One or two sentences each on how it lands in production.

4. `How I built it` at the bottom of `docs/DECISIONS.md`, from what actually happened. One paragraph in my voice: I wrote the plan and the tool's rules first, ran the build through Claude Code one phase at a time, wrote the fixtures before any parser existed, stopped it at each stop to read output and decide, made every commit after reading the diff. Then three lists: what I wrote or decided by hand; what the tool produced under those rules, file by file; what I checked and what I caught, pointing at the entries where the corrections and cutoffs are. Reread the whole log and cut anything inaccurate.
