import { isMissing, knownOrder, parseDate, parseNumber } from "./parse.js";
import { numericStats, temporalStats, topValues } from "./stats.js";
import type { Cardinality, ColumnProfile, QuantSubtype, Unit } from "./types.js";

const SHARE_NUMERIC = 0.9;
const ID_NAME = /(^|[\s_-])(id|uuid|guid|key|code|zip|zipcode|postcode|sku|index|idx)$|[a-z]Id$/;
const YEAR_NAME = /(^|[\s_-])(year|yr|fy|fiscal[\s_-]?year)$/i;
const COUNT_NAME = /(count|num|number|qty|quantity|total|units|n)$/i;
const PERCENT_NAME = /(pct|percent|percentage|share|rate|ratio)$/i;
const CURRENCY_NAME = /(price|cost|revenue|sales|amount|salary|spend|profit|income|budget|usd|eur|gbp|inr|fee)/i;
/** Names that mark a value as a level or rate rather than a quantity you can add up across rows. */
const NON_ADDITIVE_NAME = /(score|rating|index|rate|ratio|avg|average|mean|median|temp|temperature|nps|percent|pct|share|margin|price|age|height|weight)$/i;
const BOOL_STRINGS = new Set(["true", "false", "yes", "no", "y", "n", "t", "f"]);

function cardinalityOf(distinct: number, count: number): Cardinality {
  if (count > 1 && distinct === count) return "unique";
  if (distinct <= 7) return "low";
  if (distinct <= 20) return "medium";
  return "high";
}

const isInt = (n: number) => Number.isInteger(n);

/**
 * Decide a column's role and compute its stats. The decision order matters and
 * every branch writes a note, so a reviewer (or the LLM) can see why.
 */
export function profileColumn(name: string, values: unknown[]): ColumnProfile {
  const present = values.filter((v) => !isMissing(v));
  const count = present.length;
  const missing = values.length - count;
  const base = {
    additive: false,
    name,
    count,
    missing,
    missingShare: values.length === 0 ? 0 : Number((missing / values.length).toFixed(4)),
    notes: [] as string[],
  };

  if (count === 0) {
    return { ...base, role: "empty", unit: "none", distinct: 0, cardinality: "low", notes: ["no non-missing values"] };
  }

  const asStrings = present.map((v) => (v instanceof Date ? v.toISOString() : String(v).trim()));
  const distinctStrings = [...new Set(asStrings)];
  const distinct = distinctStrings.length;
  const cardinality = cardinalityOf(distinct, count);

  // 1. Temporal: real dates / ISO strings.
  const dates = present.map(parseDate);
  const dateShare = dates.filter((d) => d !== null).length / count;
  if (dateShare >= SHARE_NUMERIC) {
    const ok = dates.filter((d): d is Date => d !== null);
    const notes = ["values parse as dates"];
    if (dateShare < 1) notes.push(`${count - ok.length} value(s) did not parse as dates and were ignored`);
    return { ...base, role: "temporal", unit: "none", distinct, cardinality, temporal: temporalStats(ok), notes };
  }

  // 2. Numbers (numeric types, or strings that look numeric).
  const nums = present.map(parseNumber);
  const numShare = nums.filter((n) => n !== null).length / count;
  if (numShare >= SHARE_NUMERIC) {
    const parsed = nums.filter((n): n is NonNullable<typeof n> => n !== null);
    const values = parsed.map((p) => p.value);
    const notes: string[] = [];
    if (numShare < 1) notes.push(`${count - parsed.length} non-numeric value(s) ignored`);

    // 2a. Year column -> temporal.
    if (YEAR_NAME.test(name) && values.every((v) => isInt(v) && v >= 1800 && v <= 2200)) {
      const t = temporalStats(values.map((y) => new Date(Date.UTC(y, 0, 1))));
      return { ...base, role: "temporal", unit: "none", distinct, cardinality, temporal: t, notes: [...notes, "integer years, named as a year column"] };
    }

    // 2b. Identifier: distinct integers/strings named like an id.
    if (values.every(isInt) && distinct === count && ID_NAME.test(name)) {
      return { ...base, role: "id", unit: "none", distinct, cardinality: "unique", topValues: topValues(asStrings, 3), notes: [...notes, "unique values in a column named like an identifier"] };
    }

    const pct = parsed.filter((p) => p.percent).length / parsed.length;
    const cur = parsed.filter((p) => p.currency).length / parsed.length;
    let unit: Unit = "none";
    if (pct >= SHARE_NUMERIC) {
      unit = "percent";
      notes.push("values carry a % sign");
    } else if (cur >= SHARE_NUMERIC) {
      unit = "currency";
      notes.push("values carry a currency symbol");
    } else if (CURRENCY_NAME.test(name)) {
      unit = "currency";
      notes.push("currency inferred from the column name only");
    }

    const stats = numericStats(values);
    const allInt = values.every(isInt);

    // 2c. Small integer scale (a rating, a level): ordered categories, not a measure.
    if (allInt && distinct >= 2 && distinct <= 7 && count >= 3 * distinct && !COUNT_NAME.test(name) && unit === "none") {
      const order = [...new Set(values)].sort((a, b) => a - b).map(String);
      return { ...base, role: "ordinal", unit, distinct, cardinality, order, topValues: topValues(asStrings), numeric: stats, notes: [...notes, `integers with only ${distinct} distinct values: treated as an ordered scale`] };
    }

    let subtype: QuantSubtype = "continuous";
    if (unit === "percent") subtype = "proportion";
    else if (stats.min >= 0 && stats.max <= 1 && !allInt) {
      subtype = "proportion";
      notes.push("all values lie in [0, 1] with fractions: treated as proportions");
    } else if (PERCENT_NAME.test(name) && stats.min >= 0 && stats.max <= 100) {
      subtype = "proportion";
      unit = "percent";
      notes.push("0-100 values in a column named like a percentage");
    } else if (allInt && stats.min >= 0 && unit === "none") {
      subtype = "count";
      notes.push("non-negative integers: treated as counts");
    }
    const additive = (subtype === "count" || unit === "currency") && !NON_ADDITIVE_NAME.test(name);
    if (!additive && (subtype === "count" || unit === "currency")) notes.push("named like a level or rate, so values are averaged, not summed, when rows are combined");
    return { ...base, additive, role: "quantitative", subtype, unit, distinct, cardinality, numeric: stats, notes };
  }

  // 3. Everything else is categorical.
  const notes: string[] = [];
  if (present.every((v) => typeof v === "boolean") || distinctStrings.every((s) => BOOL_STRINGS.has(s.toLowerCase()))) {
    return { ...base, role: "nominal", unit: "none", distinct, cardinality, topValues: topValues(asStrings), notes: ["boolean-like values"] };
  }
  if (distinct === count && ID_NAME.test(name)) {
    return { ...base, role: "id", unit: "none", distinct, cardinality: "unique", topValues: topValues(asStrings, 3), notes: ["unique values in a column named like an identifier"] };
  }
  const order = knownOrder(distinctStrings);
  if (order) {
    return { ...base, role: "ordinal", unit: "none", distinct, cardinality, order, topValues: topValues(asStrings), notes: ["values match a known ordered vocabulary"] };
  }
  if (numShare > 0) notes.push(`${Math.round(numShare * 100)}% of values look numeric but too many do not; treated as categories`);
  return { ...base, role: "nominal", unit: "none", distinct, cardinality, topValues: topValues(asStrings), notes };
}
