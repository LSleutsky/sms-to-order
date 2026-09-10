
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

## Phase 2. Inbound and extraction

### 9. Raw message stored untouched, before anything else

Mine. The text goes to disk exactly as received, before extraction starts. Extraction will improve, and reparsing old messages against a better prompt is free if the raw text is there. It's also the audit trail when a contractor says "that's not what I texted". I rejected storing only the extracted lines, which would make every prompt change a data loss.

### 10. Inbound is idempotent on the provider message ID

Mine. A repeat of the same provider message ID returns the existing record instead of creating a second one. Providers retry on timeout, and without this one slow extraction call turns into two duplicate orders.

### 11. The extraction schema, with notes as a list

Claude's proposal, accepted. Each line has `rawText`, `quantity`, `unit`, `description`, and `partNumber`. The `rawText` is the exact span the line came from, so a reviewer can see it. The `quantity` and `unit` are `null` when the sender gave none, and `description` is the item with those stripped out, which is what fuzzy matching will run on. The `partNumber` is the number as typed. Claude also recommended notes as a list of strings, one entry per separate thought, over a single string or a string-or-list union, and I took that. A delivery note and a question in one text are two things. A message that is not an order has zero lines and its text lands in notes.

### 12. A missing key and a failed call are states, not crashes

Mine. The server starts without a key, the health endpoint says so, and every inbound message is stored and lands as unparsed with a reason of `no_api_key`. A failed API call does the same with the error as the reason, no retry. I rejected crashing on boot and retrying inside the request. A reviewer should be able to run this with no key and still see the queue and raw messages, and a counter person should never lose a text because a third party had a bad minute. I hit this state for real during the build. My Claude account had no usage credits remaining for API use, so every call came back 400, and all ten fixtures were sitting in the queue as unparsed with that reason.

### 13. First extraction pass needed no corrections

Mine, from reading the output. I read raw next to extracted for all ten fixtures and found nothing to fix. Quantities, units, and part numbers were right, `90s` after a size came out as elbows and not a quantity, `x2` became quantity 2, `some` became no quantity, and the one text that was not an order came out as zero lines with two notes. I had planned for a prompt change here and it was not needed, so there is one commit for this phase instead of two.

## Phase 3. Matching

### 14. Matching is code, not a model

Claude's implementation suggestions, accepted. Matching has to be auditable. When a reviewer asks why the system suggested a 3/4 elbow instead of a 1/2, the answer is a score I can show. A model in the matching path can invent a part number that does not exist, so the matcher is a pure function. Exact first, on the part-number index and sku. Then fuzzy, a token-set similarity on normalized descriptions, where normalization brings every way of writing a size to one form, expands the shorthand in the catalog and in the texts (*nip, cplg, san tee, nh, galv, prv, wht, and the rest*), and drops part-number tokens because exact already handled them. A small fixed boost when the line names the brand in `manufacturer_cleaned`. Top three per line, stored against the line. I rejected embeddings and a hybrid that falls back to embeddings. That is the obvious next step if fuzzy recall is bad on real data, and that is a conversation to have with real data and if this was a scalable feature.

### 15. The cutoff is 0.85

Claude's proposal, accepted. Claude printed the scores table for every fixture line, `docs/FIXTURE-SCORES.md`, and read it back to me. Every exact hit was right. Every fuzzy top candidate was right except the pex rings at 0.29, which are not in the catalog. The best a wrong candidate scored anywhere in the table was 0.83, the 18 inch grab bar and the 6x2 san tee, both as second choices. Claude proposed auto-matching at 0.85 and above and sending everything below to the reviewer with the top three, and I agreed. That auto-matches 15 of 23 lines and sends the hex bushing at 0.83, the copper tube at 0.67, and the pex rings to review. The cutoff came from one table of ten fixtures. It drifts the day the catalog changes, and in production it gets re-derived from how often a reviewer changes an auto-matched line.
