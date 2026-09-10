import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadCatalog } from "./catalog.js";
import { loadConfig } from "./config.js";
import { openDatabase } from "./db.js";
import { catalogRouter } from "./routes/catalog.js";

const config = loadConfig();
const database = openDatabase(config.dbPath);
const catalogRowCount = loadCatalog(database, config.catalogCsvPath);
const app = express();

app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    extraction: config.anthropicApiKey === null ? "no_api_key" : "ready"
  });
});

app.use("/api/catalog", catalogRouter(database));

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

app.listen(config.port, () => {
  console.log(`server listening on ${config.port}, database at ${database.name}, ${catalogRowCount} catalog rows`);
});
