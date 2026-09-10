import { type Database } from "better-sqlite3";

import { type MatchCandidate, type MatchableProduct, matchLine, normalizeDescriptionTokens } from "./matcher.js";

export interface StoredCandidate extends MatchCandidate {
  rank: number;
  description: string;
  manufacturer_cleaned: string;
  sku: string;
  current_price: number | null;
}

interface ProductRow {
  hajoca_product_id: string;
  manufacturer_cleaned: string;
  description_normalized: string;
  part_number_tokens: string | null;
}

interface CandidateRow {
  rank: number;
  hajoca_product_id: string;
  score: number;
  method: "exact" | "fuzzy";
  description: string;
  manufacturer_cleaned: string;
  sku: string;
  current_price: number | null;
}

/**
 * Creates the candidate table if it does not exist.
 *
 * @param database - Open SQLite connection.
 *
 * @returns {void}
 */
export const createCandidateTable = (database: Database): void => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS line_candidates (
      line_id INTEGER NOT NULL REFERENCES message_lines(id),
      rank INTEGER NOT NULL,
      hajoca_product_id TEXT NOT NULL REFERENCES catalog(hajoca_product_id),
      score REAL NOT NULL,
      method TEXT NOT NULL,
      PRIMARY KEY (line_id, rank)
    );
  `);
};

/**
 * Loads the catalog into the token form the matcher compares against.
 *
 * @param database - Open SQLite connection with the catalog loaded.
 *
 * @returns {MatchableProduct[]} Every product with its part-number and description tokens.
 */
export const loadMatchableProducts = (database: Database): MatchableProduct[] => {
  const rows = database
    .prepare(
      `SELECT c.hajoca_product_id, c.manufacturer_cleaned, c.description_normalized,
              group_concat(p.token, ' ') AS part_number_tokens
       FROM catalog c LEFT JOIN catalog_part_numbers p USING (hajoca_product_id)
       GROUP BY c.hajoca_product_id`
    )
    .all() as ProductRow[];

  return rows.map((row) => ({
    hajoca_product_id: row.hajoca_product_id,
    manufacturer_cleaned: row.manufacturer_cleaned,
    partNumberTokens: new Set(row.part_number_tokens === null ? [] : row.part_number_tokens.split(" ")),
    descriptionTokens: normalizeDescriptionTokens(row.description_normalized)
  }));
};

/**
 * Matches every line of a message and stores the top candidates against each line.
 *
 * @param database - Open SQLite connection.
 * @param messageId - The message whose lines to match.
 * @param products - The catalog from loadMatchableProducts.
 *
 * @returns {void}
 */
export const matchMessageLines = (database: Database, messageId: number, products: MatchableProduct[]): void => {
  const lines = database
    .prepare("SELECT id, raw_text, description, part_number FROM message_lines WHERE message_id = ?")
    .all(messageId) as { id: number; raw_text: string; description: string; part_number: string | null }[];

  const insertCandidate = database.prepare(
    "INSERT INTO line_candidates (line_id, rank, hajoca_product_id, score, method) VALUES (?, ?, ?, ?, ?)"
  );

  database.transaction(() => {
    for (const line of lines) {
      const candidates = matchLine(
        { rawText: line.raw_text, description: line.description, partNumber: line.part_number },
        products
      );

      candidates.forEach((candidate, index) => {
        insertCandidate.run(line.id, index + 1, candidate.hajoca_product_id, candidate.score, candidate.method);
      });
    }
  })();
};

/**
 * Reads the stored candidates for one line with the catalog fields the reviewer sees.
 *
 * @param database - Open SQLite connection.
 * @param lineId - The line.
 *
 * @returns {StoredCandidate[]} Candidates best first.
 */
export const findLineCandidates = (database: Database, lineId: number): StoredCandidate[] => {
  const rows = database
    .prepare(
      `SELECT lc.rank, lc.hajoca_product_id, lc.score, lc.method,
              c.description, c.manufacturer_cleaned, c.sku, c.current_price
       FROM line_candidates lc JOIN catalog c USING (hajoca_product_id)
       WHERE lc.line_id = ? ORDER BY lc.rank`
    )
    .all(lineId) as CandidateRow[];

  return rows;
};
