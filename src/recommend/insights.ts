import type { InsightType } from "../catalog/types.js";
import type { Finding, View } from "../profile/types.js";

/** Which insight types a view can serve, most relevant first, each with a weight in (0, 1]. */
export interface InsightOption {
  type: InsightType;
  weight: number;
}

export function insightsFor(view: View): InsightOption[] {
  const has = (t: Finding["type"]) => view.findings.some((f) => f.type === t);
  const s = new Set(view.structure);
  switch (view.kind) {
    case "measure-by-category": {
      const out: InsightOption[] = [];
      if (has("concentration")) out.push({ type: "concentration", weight: 1 });
      if (s.has("partToWhole")) out.push({ type: "part-to-whole", weight: 0.85 });
      out.push({ type: "ranking", weight: s.has("partToWhole") ? 0.75 : 0.95 });
      return out;
    }
    case "measure-over-time": {
      // When the profiler found a rank story (it replaces the trend findings with rank ones), the ranks are the
      // insight; the values over time are the fallback.
      if (s.has("rankOverTime") && has("rank-shift")) return [{ type: "rank-change", weight: 1 }, { type: "change-over-time", weight: 0.75 }];
      const out: InsightOption[] = [{ type: "change-over-time", weight: 1 }];
      if (s.has("rankOverTime")) out.push({ type: "rank-change", weight: 0.9 });
      return out;
    }
    case "distribution":
      return [{ type: "distribution", weight: 1 }];
    case "relationship":
      return [{ type: "relationship", weight: 1 }];
    case "range":
      return [{ type: "range", weight: 1 }];
    case "target":
      return [{ type: "variance-vs-target", weight: 1 }];
  }
}

const PREFERRED_FINDINGS: Record<string, Finding["type"][]> = {
  concentration: ["concentration", "dominant-category"],
  "part-to-whole": ["dominant-category", "concentration"],
  ranking: ["spread", "dominant-category"],
  "change-over-time": ["seasonality", "trend", "biggest-change"],
  "rank-change": ["rank-shift"],
  distribution: ["skew", "outliers"],
  relationship: ["correlation"],
  range: ["widest-range"],
  "variance-vs-target": ["target-gap"],
};

/** One-sentence claim for an insight, taken from the view's own findings. */
export function statementFor(view: View, insight: InsightType): string {
  const wanted = PREFERRED_FINDINGS[insight] ?? [];
  const f = wanted.map((t) => view.findings.find((x) => x.type === t)).find(Boolean) ?? view.findings[0];
  if (f) return f.text;
  if (insight === "rank-change" && view.columns.series && view.columns.measure && view.columns.time) {
    return `How ${view.columns.series} rank on ${view.columns.measure} across ${view.columns.time}`;
  }
  const cols = Object.values(view.columns).join(" / ");
  return `No strong pattern stands out in ${cols}`;
}
