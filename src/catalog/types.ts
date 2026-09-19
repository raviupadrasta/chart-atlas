/**
 * Chart knowledge the recommender reasons over. One entry per chart; the
 * vocabulary below is the contract with docs/insight-taxonomy.md (sections
 * 2, 3 and 7) and must move with it.
 */

/** The 17 insight types from the taxonomy (section 2). */
export type InsightType =
  | "ranking"
  | "change-over-time"
  | "two-point-change"
  | "rank-change"
  | "part-to-whole"
  | "composition"
  | "concentration"
  | "bridge"
  | "range"
  | "variance-vs-target"
  | "distribution"
  | "relationship"
  | "flow"
  | "hierarchy"
  | "cost-volume"
  | "magnitude-duration"
  | "outlier";

/** Cleveland–McGill perceptual channels, best to worst. */
export type Encoding = "position" | "length" | "angle" | "area" | "color";

/** Dataset-level structure flags the profiler emits (taxonomy section 3). */
export type StructureFlag =
  | "timeSeries"
  | "partToWhole"
  | "hierarchy"
  | "flow"
  | "paired"
  | "rankOverTime"
  | "hasInterval"
  | "hasTarget"
  | "hasBase"
  | "cyclical";

/** What the reader will do with the chart (taxonomy section 11.3). */
export type Purpose = "explore" | "explain" | "monitor" | "persuade" | "reference";

/**
 * How well-worn the form is. "conventional" forms are sound by default (readers know them);
 * "specialist" forms need a reading aid or a specialist audience; "novel" forms are rare.
 */
export type Familiarity = "conventional" | "specialist" | "novel";

export interface CatalogEntry {
  /** Matches the file name in src/charts, without extension (e.g. "waterfall"). */
  id: string;
  /** "planned" entries have no renderer yet; the recommender can still name them as the better choice. */
  status: "built" | "planned";
  /** Exported factory name in src/index.ts. */
  factory: string;
  /** Exported TS data type the factory takes. */
  dataType: string;
  title: string;
  /** Insight types this chart serves; the first is the one it is best at. */
  insightTypes: InsightType[];
  /** Reader questions in the reader's words, used for matching intent. */
  questions: string[];
  /** Purposes the chart serves well; scoring uses this against `context.purpose`. */
  purposes: Purpose[];
  /** Feeds the "soundness" score (utility / soundness / attractiveness). */
  familiarity: Familiarity;
  /** The channel carrying the key comparison. Drives perceptual scoring. */
  primaryEncoding: Encoding;
  requires: {
    /** Structure flags that must be true of the dataset. */
    structure: StructureFlag[];
    minRows: number;
    maxRows?: number;
    /** All values must be >= 0. */
    nonNegative?: boolean;
  };
  /** True if the marks encode value by length/area from a zero baseline (proportional-ink rule). */
  zeroBaseline: boolean;
  whenNotToUse: string[];
  /** Other chart ids (catalog entries or names in PLANNED_CHARTS) to consider instead. */
  alternatives: string[];
  /** Known rendering limitations surfaced as caveats when the chart is chosen (from the lie-factor audit). */
  knownIssues?: string[];
  /** Internal references to the principles behind the entry. Never shown to end users. */
  principles: string[];
}

/** Charts the catalog may point at that are not built yet (roadmap + baseline set). */
export const PLANNED_CHARTS = [
  "bar",
  "stackedBar",
  "line",
  "scatter",
  "histogram",
  "ecdf",
  "dotPlot",
  "slope",
  "dumbbell",
  "waffle",
  "boxplot",
  "violin",
  "ridgeline",
  "errorBars",
  "intervalBand",
  "horizon",
] as const;
