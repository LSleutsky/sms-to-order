import { useEffect, useState } from "react";

import { fetchMessage, retryMessage } from "./api";
import OrderSummary from "./OrderSummary";
import ReviewForm from "./ReviewForm";
import { type InboundMessage } from "./types";

interface MessageDetailProps {
  messageId: number;
  onChanged: () => void;
}

type DetailState =
  { status: "loading" } | { status: "error"; message: string } | { status: "ready"; message: InboundMessage };

/**
 * Loads one message and shows the raw text, notes, and the review form or the unparsed state.
 *
 * @param props - The message id and a callback for when the message changes on the server.
 *
 * @returns {JSX.Element} The detail pane.
 */
export default function MessageDetail({ messageId, onChanged }: MessageDetailProps) {
  const [detailState, setDetailState] = useState<DetailState>({ status: "loading" });
  const [retryState, setRetryState] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });

  useEffect(() => {
    let cancelled = false;

    fetchMessage(messageId)
      .then((message) => {
        if (!cancelled) {
          setDetailState({ status: "ready", message });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setDetailState({ status: "error", message: error instanceof Error ? error.message : "Unknown error" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [messageId]);

  const handleRetry = () => {
    setRetryState({ busy: true, error: null });
    retryMessage(messageId)
      .then((message) => {
        setDetailState({ status: "ready", message });
        setRetryState({ busy: false, error: null });
        onChanged();
      })
      .catch((error: unknown) => {
        setRetryState({ busy: false, error: error instanceof Error ? error.message : "Unknown error" });
      });
  };

  if (detailState.status === "loading") {
    return <p className="text-sm text-slate-500">Loading message...</p>;
  }

  if (detailState.status === "error") {
    return <p className="text-sm text-red-700">Could not load the message: {detailState.message}. Reload the page.</p>;
  }

  const { message } = detailState;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold">From {message.from}</h2>
          <span className="text-xs text-slate-500">{new Date(message.receivedAt).toLocaleString()}</span>
        </div>
        <pre className="mt-3 rounded-lg bg-slate-50 p-4 font-mono text-sm whitespace-pre-wrap text-slate-800">
          {message.body}
        </pre>
        {message.status === "extracted" && (
          <div className="mt-3 flex items-center gap-3">
            <button
              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={retryState.busy}
              type="button"
              onClick={handleRetry}
            >
              {retryState.busy ? "Re-running..." : "Re-run extraction"}
            </button>
            {retryState.error !== null && <p className="text-xs text-red-700">Re-run failed: {retryState.error}</p>}
          </div>
        )}
        {message.notes.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            {message.notes.map((note) => (
              <li key={note}>Note: {note}</li>
            ))}
          </ul>
        )}
      </section>
      {message.status === "unparsed" && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-800">
            Extraction did not run. Reason: <code>{message.unparsedReason}</code>.
            {message.unparsedReason === "no_api_key" && " Set ANTHROPIC_API_KEY and restart the server."}
            {message.unparsedReason === "empty_output" && " The model returned no lines and no notes. Retry."}
          </p>
          <button
            className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
            disabled={retryState.busy}
            type="button"
            onClick={handleRetry}
          >
            {retryState.busy ? "Retrying..." : "Retry extraction"}
          </button>
          {retryState.error !== null && <p className="mt-2 text-sm text-red-800">Retry failed: {retryState.error}</p>}
        </section>
      )}
      {message.status === "processed" && message.order !== null && (
        <OrderSummary lineCount={message.lines.length} order={message.order} />
      )}
      {message.status === "extracted" && (
        <ReviewForm
          message={message}
          onAccepted={(accepted) => {
            setDetailState({ status: "ready", message: accepted });
            onChanged();
          }}
        />
      )}
    </div>
  );
}
