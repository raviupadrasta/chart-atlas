/** Value parsing shared by role inference and stats. Pure functions; no dataset knowledge. */

const MISSING = new Set(["", "na", "n/a", "nan", "null", "none", "nil", "-", "--", "?"]);

export function isMissing(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "number") return Number.isNaN(v);
  if (typeof v === "string") return MISSING.has(v.trim().toLowerCase());
  return false;
}

export interface ParsedNumber {
  value: number;
  /** The text carried a % sign. */
  percent: boolean;
  /** The text carried a currency symbol. */
  currency: boolean;
}

/**
 * Parse a number from a number or a string like "1,234.5", "$12", "45%", "(30)".
 * Returns null when the value is not numeric. Never parses dates or booleans.
 */
export function parseNumber(v: unknown): ParsedNumber | null {
  if (typeof v === "number") return Number.isFinite(v) ? { value: v, percent: false, currency: false } : null;
  if (typeof v !== "string") return null;
  let s = v.trim();
  if (s === "") return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  let percent = false;
  let currency = false;
  if (s.endsWith("%")) {
    percent = true;
    s = s.slice(0, -1).trim();
  }
  if (/^[$€£₹¥]/.test(s)) {
    currency = true;
    s = s.slice(1).trim();
  }
  if (!/^[-+]?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?([eE][-+]?\d+)?$/.test(s) && !/^[-+]?\.\d+$/.test(s)) return null;
  const n = Number(s.replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  return { value: negative ? -n : n, percent, currency };
}

const ISO_DATE = /^\d{4}-\d{2}(-\d{2})?([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/** Parse a Date from a Date object or an ISO-8601-like string. Returns null otherwise. */
export function parseDate(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!ISO_DATE.test(s)) return null;
  const d = new Date(s.length === 7 ? `${s}-01` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/**
 * Known ordinal vocabularies. Returns the canonical order (in the order the
 * values appear in the vocabulary) when every distinct value belongs to one.
 */
export function knownOrder(distinct: string[]): string[] | null {
  const lower = distinct.map((d) => d.trim().toLowerCase());
  const vocabs: string[][] = [
    MONTHS,
    WEEKDAYS,
    ["q1", "q2", "q3", "q4"],
    ["xs", "s", "m", "l", "xl", "xxl"],
    ["very low", "low", "medium", "high", "very high"],
    ["low", "medium", "high"],
    ["poor", "fair", "good", "excellent"],
    ["strongly disagree", "disagree", "neutral", "agree", "strongly agree"],
  ];
  for (const vocab of vocabs) {
    // match on the 3-letter prefix for month/weekday vocabularies
    const key = (s: string) => (vocab === MONTHS || vocab === WEEKDAYS ? s.slice(0, 3) : s);
    if (lower.length >= 2 && lower.every((d) => vocab.includes(key(d)))) {
      const inOrder = vocab.filter((w) => lower.some((d) => key(d) === w));
      return inOrder.map((w) => distinct[lower.findIndex((d) => key(d) === w)]);
    }
  }
  return null;
}
