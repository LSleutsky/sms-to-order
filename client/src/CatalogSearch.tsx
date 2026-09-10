import { useEffect, useState } from "react";

import { searchCatalog } from "./api";
import ProductLabel from "./ProductLabel";
import { type ProductSummary } from "./types";

interface CatalogSearchProps {
  lineId: number;
  onPick: (product: ProductSummary) => void;
}

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; results: ProductSummary[] };

/**
 * A search box over the catalog endpoint for lines where none of the top three is right.
 *
 * @param props - The line id for the input id and the pick handler.
 *
 * @returns {JSX.Element} The search box and its results.
 */
export default function CatalogSearch({ lineId, onPick }: CatalogSearchProps) {
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState<SearchState>({ status: "idle" });
  const isIdle = query.trim() === "";

  useEffect(() => {
    if (isIdle) {
      return;
    }

    let cancelled = false;

    const timer = setTimeout(() => {
      setSearchState({ status: "loading" });
      searchCatalog(query)
        .then((results) => {
          if (!cancelled) {
            setSearchState({ status: "ready", results });
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setSearchState({ status: "error", message: error instanceof Error ? error.message : "Unknown error" });
          }
        });
    }, 200);

    return () => {
      cancelled = true;

      clearTimeout(timer);
    };
  }, [query, isIdle]);

  return (
    <div>
      <label className="sr-only" htmlFor={`search-${lineId}`}>
        Search the catalog
      </label>
      <input
        className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        id={`search-${lineId}`}
        placeholder="Search the catalog by part number or words"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="mt-2 min-h-5 text-xs text-slate-500">
        {!isIdle && searchState.status === "loading" && "Searching..."}
        {!isIdle && searchState.status === "error" && `Search failed: ${searchState.message}`}
        {!isIdle &&
          searchState.status === "ready" &&
          searchState.results.length === 0 &&
          "Nothing in the catalog matches."}
      </div>
      {!isIdle && searchState.status === "ready" && searchState.results.length > 0 && (
        <ul className="space-y-1">
          {searchState.results.map((product) => (
            <li key={product.hajoca_product_id}>
              <button
                className="block w-full rounded-md border border-slate-200 px-3 py-2 text-left hover:border-slate-400"
                type="button"
                onClick={() => {
                  onPick(product);
                  setQuery("");
                }}
              >
                <ProductLabel product={product} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
