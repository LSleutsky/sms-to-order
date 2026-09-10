
# Decisions

What I chose, what I passed on, and why. Written as I go, in the order the calls came up. Where Claude Code proposed something and I took it, the entry says so.

---

## 1. Feature: SMS-to-order, shop side

Mine. I picked SMS-to-order over photo-to-order and the recommender. Photo is the same parse, match, review pipeline, but the demo would live or die on vision accuracy against whatever sample photos I could scrounge up, but text demos deterministically. Shop side matches one of the actual users Onsemble intends to onboard in the future - a counter person at the branch. Photo could be a second input adapter on the same pipeline later. SMS over email because a contractor texting from a truck is the messier, more realistic scenario. If the parser survives that, evolving to an email feature is pretty simple.

## 2. Express and SQLite

Mine. Express because it's what I reach for without thinking for a POC, a short demo, and MVP, etc., and nothing here requires more. SQLite because it's one file, no service, and it ships inside the container. I rejected Postgres (*not neglected it*) because it's a second container and a migration story for a demo with one writer, which to me is the definition of overkill.

## 3. pnpm over npm

Mine. Strict `node_modules` means the client cannot import something only the server declared. That's the kind of bug that passes a typecheck and fails at runtime, and I hate that class of bug. Workspaces make two packages one install and one lockfile. npm workspaces would work, but the flat tree is exactly what lets phantom imports through. The cost is that a reviewer needs pnpm, a pretty reasonable tradeoff in my opinion, as installing pnpm is one command, thanks to Corepack, and Docker removes that would-be hindrance entirely anyway.

## 4. Docker Compose as the run path, one container

Mine. The reviewer should not have to install my toolchain to see it work. One container: Express serves the built client and the API on one port, SQLite lives in a named volume, the key comes from `.env`, and fixtures get seeded on first boot. Non-root user, healthcheck, pinned pnpm, compilers in the build stage so better-sqlite3 builds on any architecture. I rejected two containers, becayse it doubles the config for nothing at this size. Docker landed in phase 0 so a build problem surfaces while it's cheap. This is packaging, not deployment.

## 5. Tailwind

Mine. To me, a no-brainer for a POC/MVP implementation. On a timed build, the cost of styling is naming things and switching files, and Tailwind removes both. I never considered a component library, for one screen it costs more to configure than it saves, and it hides the glaring accessibility choices (*which I habitually consider having worked in frontend on sensitive applications*) I want to make myself. Plain CSS would work, but it would be slower and more boilerplate. I am accepting class strings in JSX for one screen and will extract on the third repeat.
