import Anthropic from "@anthropic-ai/sdk";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadCatalog } from "./catalog.js";
import { loadConfig } from "./config.js";
import { openDatabase } from "./db.js";
import { extractLineItems } from "./extraction.js";
import { readFixtureMessages } from "./fixtures.js";
import { createMessageTables, ingestInboundSms } from "./messages.js";
import { catalogRouter } from "./routes/catalog.js";
import { inboundRouter } from "./routes/inbound.js";

const config = loadConfig();
const database = openDatabase(config.dbPath);
const catalogRowCount = loadCatalog(database, config.catalogCsvPath);
const anthropic = config.anthropicApiKey === null ? null : new Anthropic({ apiKey: config.anthropicApiKey });
const extract = (messageBody: string) => extractLineItems(anthropic, messageBody);

createMessageTables(database);

const app = express();

app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    extraction: config.anthropicApiKey === null ? "no_api_key" : "ready"
  });
});

app.use("/api/catalog", catalogRouter(database));
app.use("/api/inbound", inboundRouter(database, extract));

if (config.isProduction) {
  const clientDistDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");

  app.use(express.static(clientDistDir));

  app.get("/{*path}", (request, response, next) => {
    if (request.path.startsWith("/api/")) {
      next();

      return;
    }

    response.sendFile(path.join(clientDistDir, "index.html"));
  });
}

const seedFixturesIfEmpty = async (): Promise<void> => {
  const messageCount = (database.prepare("SELECT count(*) AS count FROM messages").get() as { count: number }).count;

  if (!config.seedFixtures || messageCount > 0) {
    return;
  }

  for (const sms of readFixtureMessages(config.fixturesDir)) {
    const stored = await ingestInboundSms(database, sms, extract);

    console.log(
      `Seeded ${stored.providerMessageId}: ${stored.status}${stored.unparsedReason ? ` (${stored.unparsedReason})` : ""}`
    );
  }
};

app.listen(config.port, () => {
  console.log(`server listening on ${config.port}, database at ${database.name}, ${catalogRowCount} catalog rows`);

  void seedFixturesIfEmpty();
});
