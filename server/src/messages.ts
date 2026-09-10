import { type Database } from "better-sqlite3";

import { type ExtractedLine, type ExtractionOutcome } from "./extraction.js";
import { type MatchStatus, type MatchableProduct, matchStatusFor } from "./matcher.js";
import { type StoredCandidate, findLineCandidates, matchMessageLines } from "./matching.js";
import { type Order, findOrderForMessage } from "./orders.js";

export type MessageStatus = "extracted" | "unparsed" | "processed";

export interface InboundSms {
  from: string;
  body: string;
  providerMessageId: string;
}

export interface MessageLine extends ExtractedLine {
  id: number;
  position: number;
  matchStatus: MatchStatus;
  candidates: StoredCandidate[];
}

export interface InboundMessage {
  id: number;
  providerMessageId: string;
  from: string;
  body: string;
  receivedAt: string;
  status: MessageStatus;
  unparsedReason: string | null;
  notes: string[];
  lines: MessageLine[];
  order: Order | null;
}

export interface QueueEntry {
  id: number;
  providerMessageId: string;
  from: string;
  receivedAt: string;
  status: MessageStatus;
  firstLine: string;
  lineCount: number;
  matchedCount: number;
  needsReviewCount: number;
  orderedCount: number;
}

interface MessageRow {
  id: number;
  provider_message_id: string;
  sender: string;
  body: string;
  received_at: string;
  status: MessageStatus;
  unparsed_reason: string | null;
  notes: string;
}

interface LineRow {
  id: number;
  position: number;
  raw_text: string;
  quantity: number | null;
  unit: string | null;
  description: string;
  part_number: string | null;
}

/**
 * Creates the message tables if they do not exist.
 *
 * @param database - Open SQLite connection.
 *
 * @returns {void}
 */
export const createMessageTables = (database: Database): void => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_message_id TEXT NOT NULL UNIQUE,
      sender TEXT NOT NULL,
      body TEXT NOT NULL,
      received_at TEXT NOT NULL,
      status TEXT NOT NULL,
      unparsed_reason TEXT,
      notes TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS message_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL REFERENCES messages(id),
      position INTEGER NOT NULL,
      raw_text TEXT NOT NULL,
      quantity REAL,
      unit TEXT,
      description TEXT NOT NULL,
      part_number TEXT
    );
  `);
};

const readMessage = (database: Database, row: MessageRow): InboundMessage => {
  const lineRows = database
    .prepare("SELECT * FROM message_lines WHERE message_id = ? ORDER BY position")
    .all(row.id) as LineRow[];

  return {
    id: row.id,
    providerMessageId: row.provider_message_id,
    from: row.sender,
    body: row.body,
    receivedAt: row.received_at,
    status: row.status,
    unparsedReason: row.unparsed_reason,
    notes: JSON.parse(row.notes) as string[],
    lines: lineRows.map((lineRow) => {
      const candidates = findLineCandidates(database, lineRow.id);

      return {
        id: lineRow.id,
        position: lineRow.position,
        rawText: lineRow.raw_text,
        quantity: lineRow.quantity,
        unit: lineRow.unit,
        description: lineRow.description,
        partNumber: lineRow.part_number,
        matchStatus: matchStatusFor(candidates),
        candidates
      };
    }),
    order: findOrderForMessage(database, row.id)
  };
};

/**
 * Reads one message with its lines by the provider's id.
 *
 * @param database - Open SQLite connection.
 * @param providerMessageId - The provider's id for the message.
 *
 * @returns {InboundMessage | null} The message, or null when none has that id.
 */
export const findMessage = (database: Database, providerMessageId: string): InboundMessage | null => {
  const row = database.prepare("SELECT * FROM messages WHERE provider_message_id = ?").get(providerMessageId) as
    MessageRow | undefined;

  return row === undefined ? null : readMessage(database, row);
};

/**
 * Reads one message with its lines by its own id.
 *
 * @param database - Open SQLite connection.
 * @param messageId - The message id.
 *
 * @returns {InboundMessage | null} The message, or null when none has that id.
 */
export const findMessageById = (database: Database, messageId: number): InboundMessage | null => {
  const row = database.prepare("SELECT * FROM messages WHERE id = ?").get(messageId) as MessageRow | undefined;

  return row === undefined ? null : readMessage(database, row);
};

/**
 * Lists every message for the queue, newest first, with match counts.
 *
 * @param database - Open SQLite connection.
 *
 * @returns {QueueEntry[]} Queue entries.
 */
export const listQueue = (database: Database): QueueEntry[] => {
  const rows = database.prepare("SELECT * FROM messages ORDER BY received_at DESC, id DESC").all() as MessageRow[];

  return rows.map((row) => {
    const message = readMessage(database, row);

    return {
      id: message.id,
      providerMessageId: message.providerMessageId,
      from: message.from,
      receivedAt: message.receivedAt,
      status: message.status,
      firstLine: message.body.split("\n")[0],
      lineCount: message.lines.length,
      matchedCount: message.lines.filter((line) => line.matchStatus === "matched").length,
      needsReviewCount: message.lines.filter((line) => line.matchStatus === "needs_review").length,
      orderedCount: message.order === null ? 0 : message.order.lines.length
    };
  });
};

/**
 * Runs extraction for a stored message and records the outcome, replacing any earlier lines.
 *
 * @param database - Open SQLite connection.
 * @param messageId - The stored message.
 * @param extract - Runs extraction on the raw body.
 * @param products - The catalog in matchable form.
 *
 * @returns {Promise<InboundMessage>} The message after extraction and matching.
 */
export const extractStoredMessage = async (
  database: Database,
  messageId: number,
  extract: (messageBody: string) => Promise<ExtractionOutcome>,
  products: MatchableProduct[]
): Promise<InboundMessage> => {
  const row = database.prepare("SELECT * FROM messages WHERE id = ?").get(messageId) as MessageRow | undefined;

  if (row === undefined) {
    throw new Error(`Message ${messageId} does not exist`);
  }

  const outcome = await extract(row.body);

  if (!outcome.ok) {
    database
      .prepare("UPDATE messages SET status = 'unparsed', unparsed_reason = ? WHERE id = ?")
      .run(outcome.reason, messageId);
  } else {
    const insertLine = database.prepare(
      `INSERT INTO message_lines (message_id, position, raw_text, quantity, unit, description, part_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    database.transaction(() => {
      database
        .prepare("DELETE FROM line_candidates WHERE line_id IN (SELECT id FROM message_lines WHERE message_id = ?)")
        .run(messageId);
      database.prepare("DELETE FROM message_lines WHERE message_id = ?").run(messageId);
      outcome.extracted.lines.forEach((line, index) => {
        insertLine.run(messageId, index + 1, line.rawText, line.quantity, line.unit, line.description, line.partNumber);
      });
      database
        .prepare("UPDATE messages SET status = 'extracted', unparsed_reason = NULL, notes = ? WHERE id = ?")
        .run(JSON.stringify(outcome.extracted.notes), messageId);
    })();

    matchMessageLines(database, messageId, products);
  }

  const stored = findMessageById(database, messageId);

  if (stored === null) {
    throw new Error(`Message ${messageId} vanished after extraction`);
  }

  return stored;
};

/**
 * Stores an inbound text untouched, then records the extraction outcome against it.
 *
 * @param database - Open SQLite connection.
 * @param sms - The inbound text.
 * @param extract - Runs extraction on the raw body once the message is stored.
 * @param products - The catalog in matchable form.
 *
 * @returns {Promise<InboundMessage>} The stored message. A repeated providerMessageId returns the existing one.
 */
export const ingestInboundSms = async (
  database: Database,
  sms: InboundSms,
  extract: (messageBody: string) => Promise<ExtractionOutcome>,
  products: MatchableProduct[]
): Promise<InboundMessage> => {
  const existing = findMessage(database, sms.providerMessageId);

  if (existing !== null) {
    return existing;
  }

  // the raw text is on disk before extraction starts, so a failed or slow call never loses a message.
  const insertedMessage = database
    .prepare(
      `INSERT INTO messages (provider_message_id, sender, body, received_at, status, unparsed_reason)
       VALUES (?, ?, ?, ?, 'unparsed', 'pending')`
    )
    .run(sms.providerMessageId, sms.from, sms.body, new Date().toISOString());

  const messageId = Number(insertedMessage.lastInsertRowid);

  return extractStoredMessage(database, messageId, extract, products);
};
