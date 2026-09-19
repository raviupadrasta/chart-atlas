import type { Caveat, ViewColumns, ViewKind } from "../profile/types.js";
import type { InsightType, Purpose } from "../catalog/types.js";

/**
 * Who reads the chart and why (docs/insight-taxonomy.md, section 11.3).
 * Every field is optional; defaults are applied and reported back in `assumptions`.
 */
export interface Context {
  purpose?: Purpose;
  audience?: "self" | "expert" | "executive" | "public";
  medium?: "dashboard" | "report" | "slide" | "article" | "mobile";
  /** Show the chart as the main answer even when a table or a number would serve better. */
  forceChart?: boolean;
}

export type ResolvedContext = Required<Omit<Context, "forceChart">> & { forceChart: boolean };

/** How the candidate scored, on the three axes from the design notes (utility, soundness, attractiveness). */
export interface ScoreParts {
  utility: number;
  soundness: number;
  attractiveness: number;
  /** 1 when the data size is inside the chart's guidance; lower when over it. */
  fit: number;
}

export interface Candidate {
  /** Catalog id, e.g. "waterfall" or "line". */
  chart: string;
  title: string;
  /** False for planned charts that have no renderer yet. */
  built: boolean;
  /** Renderer factory name, when built. */
  factory?: string;
  /** The insight this candidate was scored for. */
  insight: InsightType;
  /** 0-100. */
  score: number;
  parts: ScoreParts;
  /** Why it was chosen, in plain words. */
  reasons: string[];
  /** Default-tier guidance this candidate goes past, stated openly (never silent). */
  overrides: string[];
}

export interface Rejection {
  chart: string;
  because: string;
  /** Rule id when a rule decided it (R.., T.., V..). */
  rule?: string;
}

/**
 * - `chart`: render `chart`.
 * - `table` / `number`: the data is too small or simple for a chart; `chart` is offered if the user opts in.
 * - `baseline-needed`: the best answer is a planned chart that does not exist yet; see `needed`.
 */
export type Answer = "chart" | "table" | "number" | "baseline-needed";

export interface Recommendation {
  view: { id: string; kind: ViewKind; columns: ViewColumns; n: number };
  answer: Answer;
  insight: { type: InsightType; statement: string };
  /** Best built chart for the insight (offered, not primary, when `answer` is table or number). */
  chart?: Candidate;
  /** Other acceptable candidates, best first, built or not. */
  alternatives: Candidate[];
  rejected: Rejection[];
  /** Planned charts that would beat the built choice, e.g. "line: not built yet". */
  gaps: string[];
  needed?: string;
  /** Why the answer is table/number when it is. */
  reason?: string;
  caveats: Caveat[];
  questionsForUser: string[];
  assumptions: ResolvedContext;
}
