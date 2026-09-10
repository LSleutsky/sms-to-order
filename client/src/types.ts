export type MessageStatus = "extracted" | "unparsed" | "processed";
export type MatchStatus = "matched" | "needs_review";

export interface ProductSummary {
  hajoca_product_id: string;
  description: string;
  manufacturer_cleaned: string;
  sku: string;
  current_price: number | null;
}

export interface Candidate extends ProductSummary {
  rank: number;
  score: number;
  method: "exact" | "fuzzy";
}

export interface MessageLine {
  id: number;
  position: number;
  rawText: string;
  quantity: number | null;
  unit: string | null;
  description: string;
  partNumber: string | null;
  matchStatus: MatchStatus;
  candidates: Candidate[];
}

export interface OrderLine extends ProductSummary {
  lineId: number;
  rawText: string;
  unit: string | null;
  quantity: number;
}

export interface Order {
  id: number;
  acceptedAt: string;
  lines: OrderLine[];
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

export interface LineEdit {
  quantity: string;
  rejected: boolean;
  chosen: ProductSummary | null;
}

export interface HealthResponse {
  ok: boolean;
  extraction: "ready" | "no_api_key";
}
