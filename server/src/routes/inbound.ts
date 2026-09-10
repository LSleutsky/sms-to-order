import { type Database } from "better-sqlite3";
import { Router } from "express";

import { type ExtractionOutcome } from "../extraction.js";
import { type MatchableProduct } from "../matcher.js";
import { type InboundSms, ingestInboundSms } from "../messages.js";

const readInboundSms = (body: unknown): InboundSms | null => {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const { from, body: text, providerMessageId } = body as Record<string, unknown>;

  if (typeof from !== "string" || typeof text !== "string" || typeof providerMessageId !== "string") {
    return null;
  }

  if (from.trim() === "" || text.trim() === "" || providerMessageId.trim() === "") {
    return null;
  }

  return {
    from,
    body: text,
    providerMessageId
  };
};

/**
 * Routes under /api/inbound.
 *
 * @param database - Open SQLite connection.
 * @param extract - Runs extraction on a raw message body.
 * @param products - The catalog in matchable form.
 *
 * @returns {Router} Express router with POST /sms.
 */
export const inboundRouter = (
  database: Database,
  extract: (messageBody: string) => Promise<ExtractionOutcome>,
  products: MatchableProduct[]
): Router => {
  const router = Router();

  router.post("/sms", async (request, response) => {
    const sms = readInboundSms(request.body);

    if (sms === null) {
      response.status(400).json({ error: "Body must have non-empty string fields from, body, and providerMessageId." });

      return;
    }

    response.json(await ingestInboundSms(database, sms, extract, products));
  });

  return router;
};
