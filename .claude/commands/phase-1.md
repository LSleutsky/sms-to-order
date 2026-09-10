Catalog.

The sample is `data/products_pc328_sample_100_anonymized.csv`. Parse with `csv-parse` (quoted fields, embedded `""` inch marks, embedded commas). Load every row into a `catalog` table at startup, one column per header, original names, text except `current_price`, `qty_avail`, `hist_purchases` as numbers. Add `description_normalized`: trimmed, internal whitespace collapsed. Leave `description` as received.

Build `catalog_part_numbers`: for each row, every token from `description` that looks like a part number (has a digit and at least one letter or hyphen, length 4 or more, not a size like `1-1/2` or `3/4x4`), including tokens inside parentheses, plus `sku` when present. Uppercased, punctuation stripped, linked to `hajoca_product_id`.

Stop. Show ten rows with their extracted tokens. Propose which column is the key, the matching text, the brand, a secondary exact key, and which are display-only, with one line of reason each from what you see in the data. Wait.

After my answer: `GET /api/catalog/search` taking `q`. Exact hit if `q` uppercased and stripped matches a part-number token or `sku`; else text search on `description_normalized`. Top 10, each result with `hajoca_product_id`, `description`, `manufacturer_cleaned`, `sku`, `current_price`. Show results for one part number and one plain phrase.

Append decision entries: Onsemble catalog loaded as-is with their columns; part numbers living inside descriptions and the token index; the column roles I confirmed, including any false tokens I dropped. Report and stop.
