import { type Database } from "better-sqlite3";
import { Router } from "express";

import { normalizePartNumber } from "../catalog.js";

export interface CatalogSearchResult {
  hajoca_product_id: string;
  description: string;
  manufacturer_cleaned: string;
  sku: string;
  current_price: number | null;
}

const RESULT_COLUMNS = "hajoca_product_id, description, manufacturer_cleaned, sku, current_price";
const RESULT_LIMIT = 10;

/**
 * Searches the catalog: exact on the part-number index and sku first, then text on the description.
 *
 * @param database - Open SQLite connection with the catalog loaded.
 * @param query - What the user typed.
 *
 * @returns {CatalogSearchResult[]} Up to ten products.
 */
export const searchCatalog = (database: Database, query: string): CatalogSearchResult[] => {
  const normalizedQuery = normalizePartNumber(query);

  if (normalizedQuery !== "") {
    const exactMatches = database
      .prepare(
        `SELECT ${RESULT_COLUMNS} FROM catalog
         WHERE hajoca_product_id IN (SELECT hajoca_product_id FROM catalog_part_numbers WHERE token = ?)
         LIMIT ${RESULT_LIMIT}`
      )
      .all(normalizedQuery) as CatalogSearchResult[];

    if (exactMatches.length > 0) {
      return exactMatches;
    }
  }

  const words = query.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [];
  }

  const whereClause = words.map(() => "description_normalized LIKE ? ESCAPE '\\'").join(" AND ");
  const likePatterns = words.map((word) => `%${word.replace(/[\\%_]/g, "\\$&")}%`);

  return database
    .prepare(
      `SELECT ${RESULT_COLUMNS} FROM catalog WHERE ${whereClause}
       ORDER BY length(description_normalized) LIMIT ${RESULT_LIMIT}`
    )
    .all(...likePatterns) as CatalogSearchResult[];
};

/**
 * Routes under /api/catalog.
 *
 * @param database - Open SQLite connection with the catalog loaded.
 *
 * @returns {Router} Express router with GET /search.
 */
export const catalogRouter = (database: Database): Router => {
  const router = Router();

  router.get("/search", (request, response) => {
    const query = typeof request.query.q === "string" ? request.query.q : "";

    response.json(searchCatalog(database, query));
  });

  return router;
};
