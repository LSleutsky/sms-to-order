import { type Database } from "better-sqlite3";

export interface OrderLineInput {
  lineId: number;
  quantity: number;
  hajocaProductId: string | null;
}

export interface AcceptedOrder {
  id: number;
  messageId: number;
  acceptedAt: string;
  lines: { lineId: number; hajocaProductId: string; quantity: number }[];
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
 * Turns a reviewed message into an order and marks the message processed.
 *
 * @param database - Open SQLite connection.
 * @param messageId - The reviewed message.
 * @param lines - One entry per message line; a null product means the line was rejected.
 *
 * @returns {AcceptedOrder} The order as stored.
 */
export const acceptOrder = (database: Database, messageId: number, lines: OrderLineInput[]): AcceptedOrder => {
  const acceptedAt = new Date().toISOString();

  const insertOrderLine = database.prepare(
    "INSERT INTO order_lines (order_id, line_id, hajoca_product_id, quantity) VALUES (?, ?, ?, ?)"
  );

  const orderId = database.transaction(() => {
    const inserted = database
      .prepare("INSERT INTO orders (message_id, accepted_at) VALUES (?, ?)")
      .run(messageId, acceptedAt);

    const id = Number(inserted.lastInsertRowid);

    for (const line of lines) {
      if (line.hajocaProductId !== null) {
        insertOrderLine.run(id, line.lineId, line.hajocaProductId, line.quantity);
      }
    }

    database.prepare("UPDATE messages SET status = 'processed' WHERE id = ?").run(messageId);

    return id;
  })();

  return {
    id: orderId,
    messageId,
    acceptedAt,
    lines: lines
      .filter((line): line is OrderLineInput & { hajocaProductId: string } => line.hajocaProductId !== null)
      .map((line) => ({
        lineId: line.lineId,
        hajocaProductId: line.hajocaProductId,
        quantity: line.quantity
      }))
  };
};
