import ProductLabel from "./ProductLabel";
import { type Order } from "./types";

interface OrderSummaryProps {
  order: Order;
  lineCount: number;
}

/**
 * The order that was placed from a message: each kept line with its quantity and product.
 *
 * @param props - The accepted order and how many lines the message had before review.
 *
 * @returns {JSX.Element} The order section.
 */
export default function OrderSummary({ order, lineCount }: OrderSummaryProps) {
  const rejectedCount = lineCount - order.lines.length;

  return (
    <section className="rounded-xl border border-emerald-200 bg-white shadow-sm">
      <div className="flex items-baseline justify-between border-b border-emerald-200 bg-emerald-50 px-5 py-3">
        <h3 className="text-sm font-semibold text-emerald-900">
          Order #{order.id} accepted, {order.lines.length} line{order.lines.length === 1 ? "" : "s"}
          {rejectedCount > 0 ? `, ${rejectedCount} rejected` : ""}
        </h3>
        <span className="text-xs text-emerald-800">{new Date(order.acceptedAt).toLocaleString()}</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {order.lines.map((line) => (
          <li key={line.lineId} className="flex items-start gap-4 px-5 py-4">
            <div className="w-24 shrink-0">
              <p className="text-xs text-slate-500">Qty{line.unit ? ` (${line.unit})` : ""}</p>
              <p className="mt-1 text-sm font-medium">{line.quantity}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm text-slate-800">{line.rawText}</p>
              <div className="mt-2 rounded-md border border-slate-200 px-3 py-2">
                <ProductLabel product={line} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
