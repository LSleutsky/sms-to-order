import { useState } from "react";

import { acceptMessage } from "./api";
import LineRow from "./LineRow";
import { type InboundMessage, type LineEdit } from "./types";

interface ReviewFormProps {
  message: InboundMessage;
  onAccepted: (message: InboundMessage) => void;
}

const initialEdits = (message: InboundMessage): Record<number, LineEdit> =>
  Object.fromEntries(
    message.lines.map((line) => [
      line.id,
      {
        quantity: line.quantity === null ? "" : String(line.quantity),
        rejected: false,
        chosen: line.matchStatus === "matched" ? line.candidates[0] : null
      }
    ])
  );

/**
 * The per-line review: quantity, chosen product, reject, and the accept button.
 *
 * @param props - The extracted message and a callback with the message once accepted.
 *
 * @returns {JSX.Element} The form.
 */
export default function ReviewForm({ message, onAccepted }: ReviewFormProps) {
  const [edits, setEdits] = useState<Record<number, LineEdit>>(() => initialEdits(message));
  const [acceptState, setAcceptState] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const keptLines = message.lines.filter((line) => !edits[line.id].rejected);

  const canAccept =
    keptLines.length > 0 &&
    keptLines.every((line) => edits[line.id].chosen !== null && Number(edits[line.id].quantity) > 0);

  const handleAccept = () => {
    setAcceptState({ busy: true, error: null });
    acceptMessage(message.id, edits)
      .then(() => {
        setAcceptState({ busy: false, error: null });
        onAccepted({ ...message, status: "processed" });
      })
      .catch((error: unknown) => {
        setAcceptState({ busy: false, error: error instanceof Error ? error.message : "Unknown error" });
      });
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-3">
        <h3 className="text-sm font-semibold">Lines</h3>
      </div>
      {message.lines.length === 0 ? (
        <p className="px-5 py-4 text-sm text-slate-500">No line items in this message. Nothing to order.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {message.lines.map((line) => (
            <LineRow
              key={line.id}
              edit={edits[line.id]}
              line={line}
              onChange={(edit) => setEdits((current) => ({ ...current, [line.id]: edit }))}
            />
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
        <p className="min-h-5 text-sm text-slate-500">
          {acceptState.error !== null
            ? `Accept failed: ${acceptState.error}`
            : canAccept
              ? `${keptLines.length} line${keptLines.length === 1 ? "" : "s"} ready to order.`
              : "Pick a product and a quantity for every kept line, or reject the line."}
        </p>
        <button
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canAccept || acceptState.busy}
          type="button"
          onClick={handleAccept}
        >
          {acceptState.busy ? "Accepting..." : "Accept order"}
        </button>
      </div>
    </section>
  );
}
