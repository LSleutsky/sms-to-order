import path from "node:path";
import { fileURLToPath } from "node:url";

export interface AppConfig {
  port: number;
  dbPath: string;
  catalogCsvPath: string;
  fixturesDir: string;
  seedFixtures: boolean;
  anthropicApiKey: string | null;
  isProduction: boolean;
}

const repoRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Reads the server configuration from environment variables.
 *
 * @returns {AppConfig} Port, database and catalog paths, API key (null when unset), and production flag.
 */
export const loadConfig = (): AppConfig => {
  const rawPort = process.env.PORT;
  const port = rawPort === undefined || rawPort === "" ? 3000 : Number(rawPort);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`PORT must be a positive integer, got "${rawPort}"`);
  }

  const rawApiKey = process.env.ANTHROPIC_API_KEY?.trim();

  return {
    port,
    dbPath: process.env.DB_PATH?.trim() || path.join(repoRootDir, "data/app.db"),
    catalogCsvPath: path.join(repoRootDir, "data/products_pc328_sample_100_anonymized.csv"),
    fixturesDir: path.join(repoRootDir, "fixtures/sms"),
    seedFixtures: process.env.SEED_FIXTURES?.trim() === "true",
    anthropicApiKey: rawApiKey === undefined || rawApiKey === "" ? null : rawApiKey,
    isProduction: process.env.NODE_ENV === "production"
  };
};
