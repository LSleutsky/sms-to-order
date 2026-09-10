
# Decisions

What I chose, what I passed on, and why. Written as I go, in the order the calls came up. Where Claude Code proposed something and I took it, the entry says so.

---

## Phase 0. Scaffold

### 1. Feature: SMS-to-order, shop side

Mine. I picked SMS-to-order over photo-to-order and the recommender. Photo is the same parse, match, review pipeline, but the demo would live or die on vision accuracy against whatever sample photos I could scrounge up, but text demos deterministically. Shop side matches one of the actual users Onsemble intends to onboard in the future - a counter person at the branch. Photo could be a second input adapter on the same pipeline later. SMS over email because a contractor texting from a truck is the messier, more realistic scenario. If the parser survives that, evolving to an email feature is pretty simple.

### 2. Express and SQLite

Mine. Express because it's what I reach for without thinking for a POC, a short demo, and MVP, etc., and nothing here requires more. SQLite because it's one file, no service, and it ships inside the container. I rejected Postgres (*not neglected it*) because it's a second container and a migration story for a demo with one writer, which to me is the definition of overkill.

### 3. pnpm over npm

Mine. Strict `node_modules` means the client cannot import something only the server declared. That's the kind of bug that passes a typecheck and fails at runtime, and I hate that class of bug. Workspaces make two packages one install and one lockfile. npm workspaces would work, but the flat tree is exactly what lets phantom imports through. The cost is that a reviewer needs pnpm, a pretty reasonable tradeoff in my opinion, as installing pnpm is one command, thanks to Corepack, and Docker removes that would-be hindrance entirely anyway.

### 4. Docker Compose as the run path, one container

Mine. The reviewer should not have to install my toolchain to see it work. One container means Express serves the built client and the API on one port, SQLite lives in a named volume, the key comes from `.env`, and fixtures get seeded on first boot. Non-root user, healthcheck, pinned pnpm, compilers in the build stage so better-sqlite3 builds on any architecture. I rejected two containers, becayse it doubles the config for nothing at this size. Docker landed in phase 0 so a build problem surfaces while it's cheap. This is packaging, not deployment.

### 5. Tailwind

Mine. To me, a no-brainer for a POC/MVP implementation. On a timed build, the cost of styling is naming things and switching files, and Tailwind removes both. I never considered a component library, for one screen it costs more to configure than it saves, and it hides the glaring accessibility choices (*which I habitually consider having worked in frontend on sensitive applications*) I want to make myself. Plain CSS would work, but it would be slower and more boilerplate. I am accepting class strings in JSX for one screen and will extract on the third repeat.

## Phase 1. Catalog

### 6. Onsemble catalog, their columns

Mine. I load the export exactly as it comes, every header a column, nothing renamed. I rejected remapping the export into my own schema. Renaming and trimming columns from a real ERP export is how you lose the one column somebody at the counter actually needed. The only added column is `description_normalized`, which is the description trimmed with the whitespace collapsed, for matching. The description itself stays as received. Price and quantity columns are numbers, everything else is text.

### 7. Part numbers live in the description

Part mine, part the Claude's. The call to index part numbers out of the descriptions was mine, from reading the file before the build. There is no part-number column a contractor would recognize. `catalog_no` is empty on every row, `sku` is an internal number and blank on half of them, and the numbers a contractor texts (*e.g. K-27428-BL, RP17443, LF25AUB-Z3*) sit inside the description, sometimes with alternates in parentheses. So exact matching runs against an index of tokens pulled out of the descriptions, plus `sku` where present. I rejected treating `sku` as the part number, since presumably nobody on a job site knows it. I rejected fuzzy-only matching, since when a text has a real manufacturer number the answer should be certain, not probable.

What counts as a token came from Claude. I wrote a rough rule (*a digit plus a letter or hyphen, four characters or more, not a size*). Claude built it, treated parentheses as separators so alternates split out cleanly, and worked out how to tell a hyphenated part number like 292-0002 from a size like 1-1/2 (*a size has a fraction, an x, or an inch mark*). It will pull the occasional false token, and that costs one extra candidate in a top-3 list that is visible. Missing a real number costs a wrong order.

### 8. Column roles and the token rules

Claude proposal, accepted. At the required stop, Claude showed me ten rows with their extracted tokens and proposed the column roles. I agreed with all of it. Key is `hajoca_product_id`, present and unique on all 100 rows. Matching text is description. Brand is `manufacturer_cleaned`, because manufacturer is `Unknown` on every row. The `sku` is a secondary exact key where present. Everything else is display only. The `category` is always `General`, `uom` always `EA`, a`vailability` always `in_stock`, `catalog_no` empty, `hajoca_profit_center` is `328` everywhere, `price` and `quantity` read anonymized. Building stock or price logic on columns that are identical on every row is building on nothing.

Claude also proposed two changes to the token rule I had written, and I took both. First, drop the false tokens the rule let through. Those were quantities with units (*120V, 18KW, 40GAL, 1.28GPF, 10GA, 18IN, 2HDL, 3-HOLE*), sizes with a suffix glued on (*2x2T, 3/8Fx3/8OD, 1/2xCLOSE, 316/L*), pipe grades (*SCH40, SCH80, CPVC80*), and NON-AB1953, which is a compliance note. Second, my rule required a letter or hyphen, which missed plain-digit numbers like M/R 77020, AOS 100109699, and the alternate 0009431. Those are real part numbers, so five or more plain digits now count. The index went from 180 tokens to 160, and every one I can see is a number a contractor *could* type.
