import { type ProductSummary } from "./types";

interface ProductLabelProps {
  product: ProductSummary;
  score?: string;
}

/**
 * A catalog product the way the reviewer sees it: description as received, brand, sku, price.
 *
 * @param props - The product and an optional score to show on the right.
 *
 * @returns {JSX.Element} The label.
 */
export default function ProductLabel({ product, score }: ProductLabelProps) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{product.description.trim()}</p>
        <p className="text-xs opacity-70">
          {[product.manufacturer_cleaned, product.sku ? `sku ${product.sku}` : "", `id ${product.hajoca_product_id}`]
            .filter(Boolean)
            .join(" / ")}
        </p>
      </div>
      <div className="shrink-0 text-right text-xs">
        {product.current_price !== null && <p>${product.current_price}</p>}
        {score !== undefined && <p className="opacity-70">{score}</p>}
      </div>
    </div>
  );
}
