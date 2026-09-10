# SMS-to-order

A contractor texts an order to a plumbing supply branch. This stores the text, pulls out the line items, matches each one against the branch catalog with a confidence score, and puts it in a review queue. A counter person confirms or fixes each line and accepts the order. Nothing becomes an order without a person.

## Run it

### Docker

```
cp .env.example .env
# put your Anthropic API key in .env
docker compose up --build
```

Open http://localhost:3000. That is everything. The database is created inside the container on first boot: the sample catalog in `data/` is loaded, and the ten texts in `fixtures/sms/` are sent through the pipeline so the queue is full when the page opens. The database lives in a named volume and survives restarts. `docker compose down -v` wipes it, and the next boot seeds again.

### pnpm

Node 22 or newer, then `corepack enable` so the pinned pnpm is used.

```
cp .env.example .env
pnpm install
pnpm dev
```

Open http://localhost:5173. The server runs on 3000 and Vite proxies `/api` to it. The database is created at `data/app.db` on first boot with the same seeding as Docker. `pnpm seed` posts the fixtures to a running server and prints what was extracted from each one.

### Without a key

Everything still starts. The health endpoint reports `no_api_key`, every message is stored and lands in the queue as unparsed with that reason, and the raw texts are all there to read. Add the key, restart, and hit Retry on any message.

## What it is

    inbound text -> store raw -> extract lines (Claude) -> match to catalog (code) -> review queue -> order

The inbound endpoint is `POST /api/inbound/sms` with `from`, `body`, and `providerMessageId`, the shape a provider webhook would post. The send box at the bottom of the queue stands in for the provider. The raw text is stored untouched before anything else happens, and a repeated provider id returns the existing message instead of creating a second one. Claude then extracts line items and notes as JSON against a fixed schema, and that is the only thing the model does. Matching is code: an exact hit on a part-number index scores 1.0, otherwise a token-set similarity on normalized descriptions, with the top three candidates kept per line. Lines at 0.85 and above are auto-matched, everything below goes to the reviewer with the top three and a catalog search. Accepting writes an order and marks the message processed. Extraction that fails, or has no key, is a state on the message with a reason and a retry button, never an exception.

## The fixtures

`fixtures/sms/` holds ten texts I wrote by hand before any parser existed, the way a plumber texts a supply house from a truck: a Kohler number typed off a box, generic fittings with no number, a brand with a vague description, sizes written the way people write them, a quantity with no unit and a unit with no quantity, a typo, a delivery note mixed into an order, one item that is not in the catalog, and one text that is not an order at all. `docs/FIXTURE-SCORES.md` is the matcher's output for every line of them.

## The sample catalog

`data/products_pc328_sample_100_anonymized.csv` is loaded as-is, every column under its own name. The manufacturer part numbers a contractor would type live inside the description text, so those are indexed out of the descriptions at load and exact matching runs against that index plus `sku` where present. `manufacturer_cleaned` is the brand. Price and quantity columns are shown on every product but nothing is built on them, since in this sample they read as placeholders.

## Docs

- `docs/BUILD-PLAN.md`, written before any code.
- `docs/DECISIONS.md`, the log as I went, with what I picked and what I passed on.
- `docs/OUT-OF-SCOPE.md`, what I left out and how it lands in production.
- `CLAUDE.md` and `.claude/commands/`, how I ran the build.
