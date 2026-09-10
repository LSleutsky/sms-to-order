import { readFileSync } from "node:fs";

import { type Database } from "better-sqlite3";
import { parse } from "csv-parse/sync";

export interface CatalogRow {
  hajoca_product_id: string;
  sku: string;
  description: string;
  category: string;
  manufacturer: string;
  manufacturer_cleaned: string;
  uom: string;
  hajoca_profit_center: string;
  current_price: number | null;
  availability: string;
  qty_avail: number | null;
  is_active: string;
  status: string;
  sell_qty: string;
  pkg_qty: string;
  pricing_qty: string;
  catalog_no: string;
  hist_purchases: number | null;
  has_image: string;
}

const TEXT_COLUMNS = [
  "hajoca_product_id",
  "sku",
  "description",
  "category",
  "manufacturer",
  "manufacturer_cleaned",
  "uom",
  "hajoca_profit_center",
  "availability",
  "is_active",
  "status",
  "sell_qty",
  "pkg_qty",
  "pricing_qty",
  "catalog_no",
  "has_image"
] as const;

const NUMERIC_COLUMNS = ["current_price", "qty_avail", "hist_purchases"] as const;
// a size is digits with a fraction, an x separator, or an inch or foot mark, like 1-1/2, 3/4x4, 1-1/2x2-1/2, 60x32x18, 9", 20'
const SIZE_PATTERN = /^(?=.*[/x'"])[\d/.-]+(?:x[\d/.-]+)*['"]*$/i;
// a size with a material or thread suffix glued on: 2x2T, 3/8Fx3/8OD, 1/2xCLOSE, 316/L, 1/2HP
const SIZE_WITH_SUFFIX_PATTERN = /^\d[^\s]*[/x]/i;
// a quantity with its unit: 120V, 18KW, 40GAL, 1.28GPF, 10GA, 18IN, 2HDL, 3-HOLE
const UNIT_PATTERN = /^\d+(?:GA|V|VT|W|KW|GAL|GPF|HP|IN|HDL|HL|HOLE)$/;
// pipe schedule and material grade, not part numbers: SCH40, SCH80, CPVC80
const GRADE_PATTERN = /^(?:SCH|CPVC)\d+$/;
// NON-AB1953 is a lead-law compliance note in the description, not a part number
const EXCLUDED_TOKENS = new Set(["NONAB1953"]);

/**
 * Parses a string as a number, returning `null` if the string is empty or not a valid number.
 *
 * @param raw - The string to parse as a number.
 *
 * @returns {number | null} The parsed number, or `null` if the string is empty or not a valid number.
 */
const parseNumber = (raw: string): number | null => {
  const trimmed = raw.trim();

  if (trimmed === "") {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Reads a catalog CSV file and returns an array of `CatalogRow` objects.
 *
 * @param csvPath - The path to the CSV file.
 *
 * @returns {CatalogRow[]} An array of `CatalogRow` objects parsed from the CSV file.
 */
const readCatalogCsv = (csvPath: string): CatalogRow[] => {
  const records = parse(readFileSync(csvPath, "utf8"), {
    columns: true,
    bom: true,
    skip_empty_lines: true
  }) as Record<string, string>[];

  return records.map((record) => {
    const row: Record<string, string | number | null> = {};

    for (const column of TEXT_COLUMNS) {
      row[column] = record[column] ?? "";
    }

    for (const column of NUMERIC_COLUMNS) {
      row[column] = parseNumber(record[column] ?? "");
    }

    return row as unknown as CatalogRow;
  });
};

/**
 * Normalizes a part number the same way on both sides of an exact match.
 *
 * @param value - Raw part number or search text.
 *
 * @returns {string} Uppercased with everything but letters and digits removed.
 */
export const normalizePartNumber = (value: string): string => value.toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Pulls every token from a description that looks like a manufacturer part number, parentheses included.
 *
 * @param description - The catalog description as received.
 *
 * @returns {string[]} Distinct tokens, uppercased with punctuation stripped.
 */
export const extractPartNumberTokens = (description: string): string[] => {
  const tokens = description.replace(/[()*]/g, " ").split(/\s+/);
  const partNumbers = new Set<string>();

  for (const token of tokens) {
    const isPlainNumber = /^\d{5,}$/.test(token);
    const hasPartNumberShape = /\d/.test(token) && /[a-z-]/i.test(token);

    if (token.length < 4 || !(isPlainNumber || hasPartNumberShape)) {
      continue;
    }

    if (SIZE_PATTERN.test(token) || SIZE_WITH_SUFFIX_PATTERN.test(token)) {
      continue;
    }

    const normalized = normalizePartNumber(token);

    if (
      normalized.length < 4 ||
      UNIT_PATTERN.test(normalized) ||
      GRADE_PATTERN.test(normalized) ||
      EXCLUDED_TOKENS.has(normalized)
    ) {
      continue;
    }

    partNumbers.add(normalized);
  }

  return [...partNumbers];
};

/**
 * Creates the catalog tables and loads the CSV into them, replacing anything already there.
 *
 * @param database - Open SQLite connection.
 * @param csvPath - Path to the product export.
 *
 * @returns {number} How many rows were loaded.
 */
export const loadCatalog = (database: Database, csvPath: string): number => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS catalog (
      hajoca_product_id TEXT PRIMARY KEY,
      sku TEXT NOT NULL,
      description TEXT NOT NULL,
      description_normalized TEXT NOT NULL,
      category TEXT NOT NULL,
      manufacturer TEXT NOT NULL,
      manufacturer_cleaned TEXT NOT NULL,
      uom TEXT NOT NULL,
      hajoca_profit_center TEXT NOT NULL,
      current_price REAL,
      availability TEXT NOT NULL,
      qty_avail REAL,
      is_active TEXT NOT NULL,
      status TEXT NOT NULL,
      sell_qty TEXT NOT NULL,
      pkg_qty TEXT NOT NULL,
      pricing_qty TEXT NOT NULL,
      catalog_no TEXT NOT NULL,
      hist_purchases REAL,
      has_image TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS catalog_part_numbers (
      token TEXT NOT NULL,
      hajoca_product_id TEXT NOT NULL REFERENCES catalog(hajoca_product_id),
      PRIMARY KEY (token, hajoca_product_id)
    );
  `);

  const rows = readCatalogCsv(csvPath);

  const insertRow = database.prepare(`
    INSERT INTO catalog (
      hajoca_product_id, sku, description, description_normalized, category, manufacturer,
      manufacturer_cleaned, uom, hajoca_profit_center, current_price, availability, qty_avail,
      is_active, status, sell_qty, pkg_qty, pricing_qty, catalog_no, hist_purchases, has_image
    ) VALUES (
      @hajoca_product_id, @sku, @description, @description_normalized, @category, @manufacturer,
      @manufacturer_cleaned, @uom, @hajoca_profit_center, @current_price, @availability, @qty_avail,
      @is_active, @status, @sell_qty, @pkg_qty, @pricing_qty, @catalog_no, @hist_purchases, @has_image
    ) ON CONFLICT (hajoca_product_id) DO UPDATE SET
      sku = excluded.sku,
      description = excluded.description,
      description_normalized = excluded.description_normalized,
      category = excluded.category,
      manufacturer = excluded.manufacturer,
      manufacturer_cleaned = excluded.manufacturer_cleaned,
      uom = excluded.uom,
      hajoca_profit_center = excluded.hajoca_profit_center,
      current_price = excluded.current_price,
      availability = excluded.availability,
      qty_avail = excluded.qty_avail,
      is_active = excluded.is_active,
      status = excluded.status,
      sell_qty = excluded.sell_qty,
      pkg_qty = excluded.pkg_qty,
      pricing_qty = excluded.pricing_qty,
      catalog_no = excluded.catalog_no,
      hist_purchases = excluded.hist_purchases,
      has_image = excluded.has_image
  `);

  const insertToken = database.prepare(
    "INSERT OR IGNORE INTO catalog_part_numbers (token, hajoca_product_id) VALUES (?, ?)"
  );

  database.transaction(() => {
    database.exec("DELETE FROM catalog_part_numbers");

    for (const row of rows) {
      insertRow.run({
        ...row,
        description_normalized: row.description.trim().replace(/\s+/g, " ")
      });

      const tokens = extractPartNumberTokens(row.description);

      if (row.sku.trim() !== "") {
        tokens.push(normalizePartNumber(row.sku));
      }

      for (const token of tokens) {
        insertToken.run(token, row.hajoca_product_id);
      }
    }
  })();

  return rows.length;
};
