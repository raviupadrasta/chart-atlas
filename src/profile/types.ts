import type { StructureFlag } from "../catalog/types.js";

/**
 * The profiler's output schema. It is the contract between the deterministic
 * profiler, the recommender's rules and the LLM skill that reads it as JSON, so
 * it stays plain data: no Dates, no NaN, no undefined (see docs/insight-taxonomy.md,
 * sections 3, 7.2 and 10.2).
 */

/** Input: one object per row. Keys are column names; values are whatever the source had. */
export type Row = Record<string, unknown>;

/** How a column can be encoded (Wilke's scale types, collapsed to what the rules need). */
export type Role = "quantitative" | "ordinal" | "nominal" | "temporal" | "id" | "empty";

/** Finer type of a quantitative column. */
export type QuantSubtype = "continuous" | "count" | "proportion";

export type Unit = "percent" | "currency" | "none";

export type Cardinality = "unique" | "low" | "medium" | "high";

export type Granularity = "year" | "quarter" | "month" | "week" | "day" | "sub-day" | "irregular";

export interface NumericStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  sd: number;
  q1: number;
  q3: number;
  /** Sample skewness (Fisher-Pearson); 0 when fewer than 3 values or no spread. */
  skew: number;
  /** Values outside 1.5 x IQR from the quartiles. */
  outlierCount: number;
  nonNegative: boolean;
  allPositive: boolean;
  /** Strictly positive and max/min >= 100: a log axis may be warranted (ch. 3). */
  spansOrders: boolean;
  /** Has both negative and positive values, or a meaningful zero to diverge from. */
  hasSignChange: boolean;
}

export interface TemporalStats {
  /** ISO 8601 strings, so the profile stays JSON. */
  min: string;
  max: string;
  spanDays: number;
  granularity: Granularity;
  /** Share of gaps between consecutive distinct dates that match the granularity (1 = perfectly regular). */
  regularity: number;
}

export interface CategoryCount {
  value: string;
  count: number;
}

export interface ColumnProfile {
  name: string;
  role: Role;
  /** Only for role "quantitative". */
  subtype?: QuantSubtype;
  /**
   * Values of different rows can be summed into a meaningful total (counts, revenue). False for scores, rates,
   * prices, ratios and everything that is not quantitative; such values are averaged when rows are combined.
   */
  additive: boolean;
  unit: Unit;
  /** Non-missing values. */
  count: number;
  missing: number;
  missingShare: number;
  distinct: number;
  cardinality: Cardinality;
  numeric?: NumericStats;
  temporal?: TemporalStats;
  /** Most frequent values, for nominal/ordinal/id columns (up to 8). */
  topValues?: CategoryCount[];
  /** For ordinal columns whose order is known (months, weekdays, quarters, low/medium/high). */
  order?: string[];
  /** Human-readable notes on how the role was decided; the LLM and reviewers read these. */
  notes: string[];
}

export interface DatasetProfile {
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  /** Candidate views, best first. */
  views: View[];
}

// ---------------------------------------------------------------------------
// Views: candidate ways to chart the dataset, ranked.
// ---------------------------------------------------------------------------

/** The shape of a candidate chart's data. */
export type ViewKind =
  | "measure-by-category"
  | "measure-over-time"
  | "distribution"
  | "relationship"
  | "range"
  | "target";

/** Which dataset column plays which part in a view. */
export type ViewRole = "dimension" | "time" | "measure" | "series" | "x" | "y" | "low" | "high" | "base" | "actual" | "target";
export type ViewColumns = Partial<Record<ViewRole, string>>;

export type FindingType =
  | "concentration"
  | "dominant-category"
  | "trend"
  | "seasonality"
  | "biggest-change"
  | "correlation"
  | "skew"
  | "outliers"
  | "spread"
  | "target-gap"
  | "rank-shift"
  | "widest-range";

/** A candidate insight, computed from the data. `strength` is 0..1 and drives the ranking. */
export interface Finding {
  type: FindingType;
  strength: number;
  text: string;
  detail: Record<string, number | string>;
}

/** A credibility or fitness warning shown with every recommendation (docs section 10.4). */
export interface Caveat {
  /** Stable id; the rule id (R..., T...) it comes from is in `rule`. */
  id: string;
  severity: "info" | "warn";
  text: string;
  rule: string;
}

export interface View {
  /** Stable id built from kind and columns. */
  id: string;
  kind: ViewKind;
  columns: ViewColumns;
  /** Plotted units: categories, time points, observations. */
  n: number;
  /** Per-category values (aggregated), for by-category views only; lets a reader or the skill see the numbers. */
  values?: { label: string; value: number }[];
  /** How repeated rows per unit were combined, if they were. */
  aggregation: "none" | "sum" | "mean";
  structure: StructureFlag[];
  findings: Finding[];
  caveats: Caveat[];
  /** 0..100. */
  score: number;
  /** Why it ranked where it did. */
  reasons: string[];
}

export interface ProfileOptions {
  /** Keep only views that use all of these columns. */
  pin?: string[];
  /** Maximum views returned (default 12). */
  maxViews?: number;
}
