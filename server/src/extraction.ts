import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";

export interface ExtractedLine {
  rawText: string;
  quantity: number | null;
  unit: string | null;
  description: string;
  partNumber: string | null;
}

export interface ExtractedMessage {
  lines: ExtractedLine[];
  notes: string[];
}

export type ExtractionOutcome = { ok: true; extracted: ExtractedMessage } | { ok: false; reason: string };

const EXTRACTION_MODEL = "claude-opus-5";

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    lines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          rawText: { type: "string" },
          quantity: { type: ["number", "null"] },
          unit: { type: ["string", "null"] },
          description: { type: "string" },
          partNumber: { type: ["string", "null"] }
        },
        required: ["rawText", "quantity", "unit", "description", "partNumber"],
        additionalProperties: false
      }
    },
    notes: { type: "array", items: { type: "string" } }
  },
  required: ["lines", "notes"],
  additionalProperties: false
} as const;

const SYSTEM_PROMPT = `You read text messages that contractors send to a contractor/plumbing supply house and pull out the line items they want to order.

For each item the sender wants, produce one line:
- rawText: the exact span of the message that line came from, copied as written.
- quantity: the number of units they asked for, or null when the message gives none (for example "some", or "a box of" with no count).
- unit: the unit word they used (box, bag, stick, ft, pk), or null when they gave none.
- description: the product with the quantity, unit, and part number removed. Keep sizes, materials, finishes, and brand names.
- partNumber: a manufacturer or catalog number if the sender typed one, exactly as typed, otherwise null.

Notes are anything that is not a line item: delivery instructions, job names, questions, greetings, follow-ups. Put each separate thought in its own entry. If the message is not an order at all, return zero lines and put the message in notes.

Contractor/plumbing shorthand to respect: a number followed by a size is usually a quantity, but "90" and "45" after a size are elbows, not quantities. "x2" after an item means quantity 2. "nip" is nipple, "cplg" is coupling, "ell" is elbow, "san tee" is sanitary tee, "prv" is pressure reducing valve, "wht" is white, "cp" is chrome, "bn" is brushed nickel, "galv" is galvanized.

Do not expand shorthand in description; keep what the sender wrote.`;

/**
 * Extracts line items and notes from one inbound text through the Claude API.
 *
 * @param anthropic - Configured client, or null when no API key is set.
 * @param messageBody - The raw text as received.
 *
 * @returns {Promise<ExtractionOutcome>} The extracted message, or the reason it could not be extracted.
 */
export const extractLineItems = async (
  anthropic: Anthropic | null,
  messageBody: string
): Promise<ExtractionOutcome> => {
  if (anthropic === null) {
    return {
      ok: false,
      reason: "no_api_key"
    };
  }

  try {
    const response = await anthropic.messages.parse({
      model: EXTRACTION_MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: messageBody
        }
      ],
      output_config: { format: jsonSchemaOutputFormat(EXTRACTION_SCHEMA) }
    });

    if (response.stop_reason !== "end_turn") {
      return { ok: false, reason: `stop_reason_${response.stop_reason}` };
    }

    if (response.parsed_output === null) {
      return {
        ok: false,
        reason: "unparseable_output"
      };
    }

    return {
      ok: true,
      extracted: response.parsed_output
    };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return {
        ok: false,
        reason: `api_error_${error.status}`
      };
    }

    throw error;
  }
};
