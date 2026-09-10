Review UI.

Stop first: should the raw message text highlight which span each extracted line came from, or is that out of scope? Wait.

One page. Left: queue, newest first, each with sender, first line, counts of matched / needs review / unparsed. Click to open. Right: raw text at top, always visible, never editable. One row per line: raw line, quantity (editable), match. Auto-matched lines show `description` as received, `manufacturer_cleaned` if present, `sku` if present, `current_price`. Needs-review lines show the top 3 the same way with scores as clickable options, plus a search box on the catalog endpoint. Reject on every line. "Accept order" enabled only when every non-rejected line has a chosen product. Accepting creates an order record and marks the message processed. Unparsed messages show the reason and a retry button.

Tailwind utilities only. Readable, modern, and sleek. Stop when the full flow works on every fixture in `pnpm dev`.

Append decision entries: top 3 candidates for low-confidence lines; never auto-place; the highlight scope call. Deliberately not including accessibility support due to the queue view being the primary interaction point, and bandwidth. Report and stop.
