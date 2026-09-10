import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig } from "./config.js";
import { openDatabase } from "./db.js";

const config = loadConfig();
const database = openDatabase(config.dbPath);
const app = express();

app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    extraction: config.anthropicApiKey === null ? "no_api_key" : "ready"
  });
});

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
  console.log(`server listening on ${config.port}, database at ${database.name}`);
});
