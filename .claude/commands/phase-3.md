Matching.

Pure function, no LLM, no network. For each extracted line:

1. Exact: the line's `partNumber` or any part-number-looking token in its `rawText` matches `catalog_part_numbers` or a `sku`: score 1.0, method `exact`.
2. Fuzzy: normalize the line's description and every `description_normalized` the same way, token-set similarity, method `fuzzy`. Normalization from what's in this catalog and the fixtures: lowercase; strip inch and foot marks; `1-1/2`, `1 1/2`, `1.5`, `1-1/2"` to one form; `x`/`X` between sizes as a separator; expand the abbreviations present in the file (ell, fct, lav, tlt, wht, cp, bn, san tee, nh, galv, xh, lf, red, cplg, nip, prv, t&s, wh, and whatever else you find). If the line names a brand matching `manufacturer_cleaned`, a small fixed boost, with a comment on why it's fixed.
3. Top 3 per line with scores, stored linked to the line.

Print the scores table: every fixture line, raw text, top candidate and score, second, third. Write it to `docs/FIXTURE-SCORES.md`. Do NOT set thresholds. Stop and wait for my cutoffs.

Append decision entries: matching is code not a model; the cutoffs, what I saw in the table that put them there, with a link to `FIXTURE-SCORES.md`. Report and stop.
