import { mkdirSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

/**
 * Opens the SQLite database, creating its directory if needed.
 *
 * @param dbPath - File path for the database.
 *
 * @returns {Database.Database} An open connection in WAL mode.
 */
export const openDatabase = (dbPath: string): Database.Database => {
  mkdirSync(path.dirname(dbPath), { recursive: true });

  const database = new Database(dbPath);

  database.pragma("journal_mode = WAL");

  return database;
};
