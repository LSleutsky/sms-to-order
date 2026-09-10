import { type Database } from "better-sqlite3";

export interface OrderLineInput {
  lineId: number;
  quantity: number;
  hajocaProductId: string | null;
}

export interface OrderLine {
  lineId: number;
  rawText: string;
  unit: string | null;
  quantity: number;
  hajoca_product_id: string;
  description: string;
  manufacturer_cleaned: string;
  sku: string;
  current_price: number | null;
}

export interface Order {
  id: number;
  acceptedAt: string;
  lines: OrderLine[];
}

interface OrderRow {
  id: number;
  accepted_at: string;
}

interface OrderLineRow {
  line_id: number;
  raw_text: string;
  unit: string | null;
  quantity: number;
  hajoca_product_id: string;
  description: string;
  manufacturer_cleaned: string;
  sku: string;
  current_price: number | null;
}

/**
 * Creates the order tables if they do not exist.
 *
 * @param database - Open SQLite connection.
 *
 * @returns {void}
 */
export const createOrderTables = (database: Database): void => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL UNIQUE REFERENCES messages(id),
      accepted_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS order_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      line_id INTEGER NOT NULL REFERENCES message_lines(id),
      hajoca_product_id TEXT NOT NULL REFERENCES catalog(hajoca_product_id),
      quantity REAL NOT NULL
    );
  `);
};

/**
 * Reads the order accepted for a message, with the product fields the reviewer sees.
 *
 * @param database - Open SQLite connection.
 * @param messageId - The message.
 *
 * @returns {Order | null} The order, or null when the message has not been accepted.
 */
export const findOrderForMessage = (database: Database, messageId: number): Order | null => {
  const orderRow = database.prepare("SELECT id, accepted_at FROM orders WHERE message_id = ?").get(messageId) as
    OrderRow | undefined;

  if (orderRow === undefined) {
    return null;
  }

  const lineRows = database
    .prepare(
      `SELECT ol.line_id, ml.raw_text, ml.unit, ol.quantity, ol.hajoca_product_id,
              c.description, c.manufacturer_cleaned, c.sku, c.current_price
       FROM order_lines ol
       JOIN message_lines ml ON ml.id = ol.line_id
       JOIN catalog c ON c.hajoca_product_id = ol.hajoca_product_id
       WHERE ol.order_id = ? ORDER BY ml.position`
    )
    .all(orderRow.id) as OrderLineRow[];

  return {
    id: orderRow.id,
    acceptedAt: orderRow.accepted_at,
    lines: lineRows.map((lineRow) => ({
      lineId: lineRow.line_id,
      rawText: lineRow.raw_text,
      unit: lineRow.unit,
      quantity: lineRow.quantity,
      hajoca_product_id: lineRow.hajoca_product_id,
      description: lineRow.description,
      manufacturer_cleaned: lineRow.manufacturer_cleaned,
      sku: lineRow.sku,
      current_price: lineRow.current_price
    }))
  };
};

/**
 * Turns a reviewed message into an order and marks the message processed.
 *
 * @param database - Open SQLite connection.
 * @param messageId - The reviewed message.
 * @param lines - One entry per message line; a null product means the line was rejected.
 *
 * @returns {void}
 */
export const acceptOrder = (database: Database, messageId: number, lines: OrderLineInput[]): void => {
  const acceptedAt = new Date().toISOString();

  const insertOrderLine = database.prepare(
    "INSERT INTO order_lines (order_id, line_id, hajoca_product_id, quantity) VALUES (?, ?, ?, ?)"
  );

  database.transaction(() => {
    const inserted = database
      .prepare("INSERT INTO orders (message_id, accepted_at) VALUES (?, ?)")
      .run(messageId, acceptedAt);

    const orderId = Number(inserted.lastInsertRowid);

    for (const line of lines) {
      if (line.hajocaProductId !== null) {
        insertOrderLine.run(orderId, line.lineId, line.hajocaProductId, line.quantity);
      }
    }

    database.prepare("UPDATE messages SET status = 'processed' WHERE id = ?").run(messageId);
  })();
};
