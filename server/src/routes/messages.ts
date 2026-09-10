import { type Database } from "better-sqlite3";
import { Router } from "express";

import { type ExtractionOutcome } from "../extraction.js";
import { type MatchableProduct } from "../matcher.js";
import { extractStoredMessage, findMessageById, listQueue } from "../messages.js";
import { type OrderLineInput, acceptOrder } from "../orders.js";

const readOrderLines = (body: unknown): OrderLineInput[] | null => {
  if (typeof body !== "object" || body === null || !Array.isArray((body as { lines?: unknown }).lines)) {
    return null;
  }

  const lines: OrderLineInput[] = [];

  for (const entry of (body as { lines: unknown[] }).lines) {
    if (typeof entry !== "object" || entry === null) {
      return null;
    }

    const { lineId, quantity, hajocaProductId } = entry as Record<string, unknown>;
    const productIsValid = hajocaProductId === null || typeof hajocaProductId === "string";

    if (typeof lineId !== "number" || typeof quantity !== "number" || !productIsValid) {
      return null;
    }

    lines.push({ lineId, quantity, hajocaProductId: hajocaProductId as string | null });
  }

  return lines;
};

/**
 * Routes under /api/messages: the queue, one message, retry extraction, and accept as an order.
 *
 * @param database - Open SQLite connection.
 * @param extract - Runs extraction on a raw message body.
 * @param products - The catalog in matchable form.
 *
 * @returns {Router} Express router.
 */
export const messagesRouter = (
  database: Database,
  extract: (messageBody: string) => Promise<ExtractionOutcome>,
  products: MatchableProduct[]
): Router => {
  const router = Router();

  router.get("/", (_request, response) => {
    response.json(listQueue(database));
  });

  router.get("/:id", (request, response) => {
    const message = findMessageById(database, Number(request.params.id));

    if (message === null) {
      response.status(404).json({ error: "No message with that id." });

      return;
    }

    response.json(message);
  });

  router.post("/:id/retry", async (request, response) => {
    const message = findMessageById(database, Number(request.params.id));

    if (message === null) {
      response.status(404).json({ error: "No message with that id." });

      return;
    }

    if (message.status !== "unparsed") {
      response.status(409).json({ error: "Only unparsed messages can be retried." });

      return;
    }

    response.json(await extractStoredMessage(database, message.id, extract, products));
  });

  router.post("/:id/accept", (request, response) => {
    const message = findMessageById(database, Number(request.params.id));
    const lines = readOrderLines(request.body);

    if (message === null) {
      response.status(404).json({ error: "No message with that id." });

      return;
    }

    if (message.status !== "extracted") {
      response.status(409).json({ error: "Only extracted messages that are not yet processed can be accepted." });

      return;
    }

    const messageLineIds = new Set(message.lines.map((line) => line.id));

    const linesAreComplete =
      lines !== null && lines.length === message.lines.length && lines.every((line) => messageLineIds.has(line.lineId));

    if (!linesAreComplete) {
      response.status(400).json({ error: "Body must have one entry in lines for every line of the message." });

      return;
    }

    const productExists = database.prepare("SELECT 1 FROM catalog WHERE hajoca_product_id = ?");
    const orderable = lines.filter((line) => line.hajocaProductId !== null);

    const everyLineIsOrderable = orderable.every(
      (line) => line.quantity > 0 && productExists.get(line.hajocaProductId) !== undefined
    );

    if (!everyLineIsOrderable) {
      response.status(400).json({ error: "Every kept line needs a catalog product and a quantity above zero." });

      return;
    }

    acceptOrder(database, message.id, lines);

    const accepted = findMessageById(database, message.id);

    if (accepted === null) {
      throw new Error(`Message ${message.id} vanished after accepting its order`);
    }

    response.json(accepted);
  });

  return router;
};
