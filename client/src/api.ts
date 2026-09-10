import { type InboundMessage, type LineEdit, type ProductSummary, type QueueEntry } from "./types";

/**
 * Fetches JSON data from the specified URL.
 *
 * @param url - The URL to fetch from.
 * @param init - Optional request initialization options.
 *
 * @returns {Promise<T>} The parsed JSON data.
 */
const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;

    throw new Error(body?.error ?? `Server responded with ${response.status}`);
  }

  return (await response.json()) as T;
};

/**
 * Sends a JSON POST request to the specified URL.
 *
 * @param url - The URL to send the request to.
 * @param body - The data to send in the request body.
 *
 * @returns {Promise<T>} The parsed JSON response.
 */
const postJson = <T>(url: string, body?: unknown): Promise<T> =>
  fetchJson<T>(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

/**
 * Fetches the queue of inbound messages.
 *
 * @returns {Promise<QueueEntry[]>} The queue of inbound messages.
 */
export const fetchQueue = (): Promise<QueueEntry[]> => fetchJson("/api/messages");

/**
 * Fetches a specific message by its ID.
 *
 * @param messageId - The ID of the message to fetch.
 *
 * @returns {Promise<InboundMessage>} The fetched message.
 */
export const fetchMessage = (messageId: number): Promise<InboundMessage> => fetchJson(`/api/messages/${messageId}`);

/**
 * Searches the catalog for products matching the given query.
 *
 * @param query - The search query.
 *
 * @returns {Promise<ProductSummary[]>} The matching products.
 */
export const searchCatalog = (query: string): Promise<ProductSummary[]> =>
  fetchJson(`/api/catalog/search?q=${encodeURIComponent(query)}`);

/**
 * Re-runs extraction and matching for a message by its ID.
 *
 * @param messageId - The ID of the message to retry.
 *
 * @returns {Promise<InboundMessage>} The retried message.
 */
export const retryMessage = (messageId: number): Promise<InboundMessage> =>
  postJson(`/api/messages/${messageId}/retry`);

/**
 * Sends a text into the inbound endpoint the way an SMS provider would.
 *
 * @param from - The sender's phone number.
 * @param body - The text as typed.
 *
 * @returns {Promise<InboundMessage>} The stored message after extraction and matching.
 */
export const sendSms = (from: string, body: string): Promise<InboundMessage> =>
  postJson("/api/inbound/sms", {
    from,
    body,
    providerMessageId: `ui-${crypto.randomUUID()}`
  });

/**
 * Accepts a message by its ID and applies the given edits.
 *
 * @param messageId - The ID of the message to accept.
 * @param edits - The edits to apply to the message.
 *
 * @returns {Promise<InboundMessage>} The message with its accepted order.
 */
export const acceptMessage = (messageId: number, edits: Record<number, LineEdit>): Promise<InboundMessage> =>
  postJson(`/api/messages/${messageId}/accept`, {
    lines: Object.entries(edits).map(([lineId, edit]) => ({
      lineId: Number(lineId),
      quantity: Number(edit.quantity),
      hajocaProductId: edit.rejected ? null : (edit.chosen?.hajoca_product_id ?? null)
    }))
  });
