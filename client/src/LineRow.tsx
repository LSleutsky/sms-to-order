import CatalogSearch from "./CatalogSearch";
import ProductLabel from "./ProductLabel";
import { type LineEdit, type MessageLine } from "./types";

interface LineRowProps {
  line: MessageLine;
  edit: LineEdit;
  onChange: (edit: LineEdit) => void;
}

/**
 * One extracted line: raw text, editable quantity, the match or the top three choices, and reject.
 *
 * @param props - The line, its current edit, and the change handler.
 *
 * @returns {JSX.Element} The row.
 */
export default function LineRow({ line, edit, onChange }: LineRowProps) {
  const chosenId = edit.chosen?.hajoca_product_id ?? null;

  return (
    <li className={`px-5 py-4 ${edit.rejected ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-4">
        <div className="w-24 shrink-0">
          <label className="block text-xs text-slate-500" htmlFor={`quantity-${line.id}`}>
            Qty{line.unit ? ` (${line.unit})` : ""}
          </label>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50"
            disabled={edit.rejected}
            id={`quantity-${line.id}`}
            min="0"
            type="number"
            value={edit.quantity}
            onChange={(event) => onChange({ ...edit, quantity: event.target.value })}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm text-slate-800">{line.rawText}</p>
          {!edit.rejected && line.matchStatus === "matched" && edit.chosen !== null && (
            <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
              <ProductLabel product={edit.chosen} />
            </div>
          )}
          {!edit.rejected && line.matchStatus === "needs_review" && (
            <div className="mt-2 space-y-2">
              <p className="text-xs font-medium text-amber-700">Needs review. Pick one:</p>
              {line.candidates.map((candidate) => (
                <button
                  key={candidate.hajoca_product_id}
                  className={`block w-full rounded-md border px-3 py-2 text-left transition ${
                    chosenId === candidate.hajoca_product_id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 hover:border-slate-400"
                  }`}
                  type="button"
                  onClick={() => onChange({ ...edit, chosen: candidate })}
                >
                  <ProductLabel
                    product={candidate}
                    score={candidate.method === "exact" ? "exact" : candidate.score.toFixed(2)}
                  />
                </button>
              ))}
              {edit.chosen !== null &&
                !line.candidates.some((candidate) => candidate.hajoca_product_id === chosenId) && (
                  <div className="rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-white">
                    <ProductLabel product={edit.chosen} />
                  </div>
                )}
              <CatalogSearch lineId={line.id} onPick={(product) => onChange({ ...edit, chosen: product })} />
            </div>
          )}
        </div>
        <button
          className="shrink-0 rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          type="button"
          onClick={() => onChange({ ...edit, rejected: !edit.rejected })}
        >
          {edit.rejected ? "Restore" : "Reject"}
        </button>
      </div>
    </li>
  );
}
