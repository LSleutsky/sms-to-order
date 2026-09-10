Inbound and extraction.

`POST /api/inbound/sms`. Body: `from`, `body`, `providerMessageId`. Store the raw message untouched before anything else. Dedupe on `providerMessageId`; a repeat returns the existing record.

Stop. Show the JSON schema you propose for line items (`rawText`, `quantity`, `unit`, `description`, `partNumber` nullable) and ask whether `notes` is one string or a list. Wait.

Extraction through the Anthropic SDK with structured output; verify the API in its `.d.ts` first. If `ANTHROPIC_API_KEY` is missing, the server still starts and every inbound message lands as `unparsed` with reason `no_api_key`. If the call fails, store the message anyway, flag `unparsed` with the reason, no retry.

`pnpm seed`: posts every file in `fixtures/sms/` to the endpoint, `providerMessageId` = filename, prints raw text next to extracted lines per message. On boot, if `SEED_FIXTURES=true` and the messages table is empty, run the same seeding in-process.

Run `pnpm seed`. Stop and wait for my corrections. Apply them to the prompt once, rerun.

Append decision entries: raw message stored untouched; idempotent inbound; the schema and my `notes` call; missing key and failed extraction as explicit states; what extracted wrong on the first pass, what I changed, what the rerun showed. Report and stop.
