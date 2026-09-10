import { extractPartNumberTokens, normalizePartNumber } from "./catalog.js";

export interface MatchableLine {
  rawText: string;
  description: string;
  partNumber: string | null;
}

export interface MatchableProduct {
  hajoca_product_id: string;
  manufacturer_cleaned: string;
  partNumberTokens: Set<string>;
  descriptionTokens: Set<string>;
}

export interface MatchCandidate {
  hajoca_product_id: string;
  score: number;
  method: "exact" | "fuzzy";
}

export type MatchStatus = "matched" | "needs_review";

const BRAND_BOOST = 0.1;
const CANDIDATE_LIMIT = 3;
const AUTO_MATCH_THRESHOLD = 0.85;
const UNIT_SUFFIX_PATTERN = /(\d)(in|ft|gpf|ga|gal|kw|hp|pc|pk|v|w)\b/g;
const STOP_WORDS = new Set(["a", "an", "the", "of", "and", "for", "with", "w", "one", "some", "each", "ea"]);

const ABBREVIATIONS: Record<string, string> = {
  ell: "elbow",
  ells: "elbow",
  "90s": "90 elbow",
  "45s": "45 elbow",
  fct: "faucet",
  lav: "lavatory",
  tlt: "toilet",
  wht: "white",
  cp: "chrome",
  bn: "brushed nickel",
  san: "sanitary",
  nh: "no hub",
  galv: "galvanized",
  xh: "extra heavy",
  lf: "lead free",
  red: "reducing",
  cplg: "coupling",
  coup: "coupling",
  nip: "nipple",
  nips: "nipple",
  prv: "pressure reducing valve",
  "t&s": "tub shower",
  wh: "water heater",
  hdl: "handle",
  hl: "handle",
  pc: "piece",
  rf: "round front",
  ss: "stainless steel",
  ci: "cast iron",
  tp: "toilet paper",
  sq: "square",
  div: "diverter",
  comp: "compression",
  fem: "female",
  conv: "conversion",
  elec: "electric",
  frstndg: "freestanding",
  assy: "assembly",
  nat: "natural",
  bl: "black",
  vs: "vibrant stainless",
  ips: "iron pipe"
};

/**
 * Converts a fraction to a decimal string.
 *
 * @param whole - The whole number part of the fraction.
 * @param numerator - The numerator part of the fraction.
 * @param denominator - The denominator part of the fraction.
 *
 * @returns {string} The decimal string representation of the fraction.
 */
const fractionToDecimal = (whole: string, numerator: string, denominator: string): string =>
  String(Number(whole || "0") + Number(numerator) / Number(denominator));

/**
 * Singularizes a word.
 *
 * @param word - The word to singularize.
 *
 * @returns {string} The singularized word.
 */
const singularize = (word: string): string =>
  word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word;

/**
 * Turns a product description or an extracted line into the token set the fuzzy matcher compares.
 *
 * @param text - Catalog description or extracted line description.
 *
 * @returns {Set<string>} Lowercased tokens with sizes in one form, shorthand expanded, and part numbers dropped.
 */
export const normalizeDescriptionTokens = (text: string): Set<string> => {
  const withoutPartNumbers = text
    .replace(/[()*]/g, " ")
    .split(/\s+/)
    .filter((token) => extractPartNumberTokens(token).length === 0)
    .join(" ");

  const normalized = withoutPartNumbers
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/(\d+)[- ](\d+)\/(\d+)/g, (_match, whole: string, numerator: string, denominator: string) =>
      fractionToDecimal(whole, numerator, denominator)
    )
    .replace(/(\d+)\/(\d+)/g, (_match, numerator: string, denominator: string) =>
      fractionToDecimal("0", numerator, denominator)
    )
    .replace(UNIT_SUFFIX_PATTERN, "$1 $2")
    .replace(/(\d)\s*in\b/g, "$1")
    .replace(/(\d)\s*x\s*(?=[a-z0-9.])/g, "$1 ")
    .replace(/[^a-z0-9.&\s]/g, " ");

  const tokens = new Set<string>();

  for (const word of normalized.split(/\s+/)) {
    const expansion = ABBREVIATIONS[word];

    for (const token of (expansion ?? word).split(" ")) {
      const cleaned = singularize(token.replace(/^\.+|\.+$/g, ""));

      if (cleaned !== "" && !STOP_WORDS.has(cleaned)) {
        tokens.add(cleaned);
      }
    }
  }

  return tokens;
};

/**
 * Calculates the Dice similarity between two sets of tokens.
 *
 * @param left - The first set of tokens.
 * @param right - The second set of tokens.
 *
 * @returns {number} The Dice similarity score.
 */
const diceSimilarity = (left: Set<string>, right: Set<string>): number => {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let shared = 0;

  for (const token of left) {
    if (right.has(token)) {
      shared += 1;
    }
  }

  return (2 * shared) / (left.size + right.size);
};

/**
 * Finds the top three catalog candidates for one extracted line, exact part-number hits first.
 *
 * @param line - The extracted line.
 * @param products - The catalog prepared by prepareProduct.
 *
 * @returns {MatchCandidate[]} Up to three candidates, best first.
 */
export const matchLine = (line: MatchableLine, products: MatchableProduct[]): MatchCandidate[] => {
  const lineTokens = normalizeDescriptionTokens(line.description);
  const partNumbers = new Set(extractPartNumberTokens(line.rawText));

  if (line.partNumber !== null) {
    partNumbers.add(normalizePartNumber(line.partNumber));
  }

  const exactCandidates: MatchCandidate[] = [];
  const fuzzyCandidates: MatchCandidate[] = [];

  for (const product of products) {
    const hasExactHit = [...partNumbers].some((partNumber) => product.partNumberTokens.has(partNumber));

    if (hasExactHit) {
      exactCandidates.push({ hajoca_product_id: product.hajoca_product_id, score: 1, method: "exact" });
      continue;
    }

    const brand = product.manufacturer_cleaned.toLowerCase();
    const brandBoost = brand !== "" && lineTokens.has(brand) ? BRAND_BOOST : 0;
    const score = Math.min(1, diceSimilarity(lineTokens, product.descriptionTokens) + brandBoost);

    if (score > 0) {
      fuzzyCandidates.push({
        hajoca_product_id: product.hajoca_product_id,
        score: Number(score.toFixed(3)),
        method: "fuzzy"
      });
    }
  }

  fuzzyCandidates.sort((left, right) => right.score - left.score);

  return [...exactCandidates, ...fuzzyCandidates].slice(0, CANDIDATE_LIMIT);
};

/**
 * Decides whether a line's top candidate is trusted or the reviewer picks from the top three.
 *
 * @param candidates - The line's candidates, best first.
 *
 * @returns {MatchStatus} matched when the top score clears the cutoff, otherwise needs_review.
 */
export const matchStatusFor = (candidates: MatchCandidate[]): MatchStatus =>
  candidates.length > 0 && candidates[0].score >= AUTO_MATCH_THRESHOLD ? "matched" : "needs_review";
