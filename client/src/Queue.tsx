import { type QueueEntry } from "./types";

interface QueueProps {
  entries: QueueEntry[];
  selectedId: number | null;
  onSelect: (messageId: number) => void;
}

const STATUS_LABELS: Record<QueueEntry["status"], { label: string; className: string }> = {
  extracted: {
    label: "Needs review",
    className: "bg-amber-100 text-amber-800"
  },
  unparsed: {
    label: "Unparsed",
    className: "bg-red-100 text-red-800"
  },
  processed: {
    label: "Accepted",
    className: "bg-emerald-100 text-emerald-800"
  }
};

/**
 * The list of inbound messages, newest first.
 *
 * @param props - Queue entries, the selected id, and the select handler.
 *
 * @returns {JSX.Element} The queue list.
 */
export default function Queue({ entries, selectedId, onSelect }: QueueProps) {
  if (entries.length === 0) {
    return <p className="p-4 text-sm text-slate-500">No messages yet. Post one to /api/inbound/sms.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {entries.map((entry) => {
        const status = STATUS_LABELS[entry.status];
        const isSelected = entry.id === selectedId;

        return (
          <li key={entry.id}>
            <button
              className={`block w-full px-4 py-3 text-left transition hover:bg-slate-50 ${isSelected ? "bg-slate-100" : ""}`}
              type="button"
              onClick={() => onSelect(entry.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{entry.from}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                  {status.label}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-slate-600">{entry.firstLine}</p>
              <p className="mt-1 text-xs text-slate-500">
                {entry.status === "unparsed"
                  ? "No lines extracted"
                  : `${entry.matchedCount} matched, ${entry.needsReviewCount} to review, ${entry.lineCount} lines`}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
