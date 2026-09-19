import { profileDataset } from "../profile/index.js";
import type { Caveat, DatasetProfile, Row } from "../profile/types.js";
import { mapView, type Mapped } from "../recommend/map.js";
import { recommend } from "../recommend/recommend.js";
import type { Candidate, Context, Recommendation } from "../recommend/types.js";
import { toEcharts } from "./echarts.js";
import { toObservablePlot } from "./observable-plot.js";
import { toPlotly } from "./plotly.js";
import { toPython } from "./python.js";
import { TARGETS, type ChartSpec, type Target } from "./spec.js";
import { toSpec } from "./to-spec.js";
import { toVegaLite } from "./vega-lite.js";

export { TARGETS } from "./spec.js";
export type { Axis, ChartSpec, Datum, Layer, Target, Tone } from "./spec.js";
export { toSpec } from "./to-spec.js";
export { toVegaLite } from "./vega-lite.js";
export { toObservablePlot } from "./observable-plot.js";
export { toPython } from "./python.js";
export { toPlotly } from "./plotly.js";
export { toEcharts } from "./echarts.js";

/** What an export produces: a JSON object for Vega-Lite, source code for the other five. */
export type Output =
  | { target: "vega-lite"; format: "json"; body: Record<string, unknown> }
  | { target: Exclude<Target, "vega-lite">; format: "javascript" | "python"; body: string };

/** Turn a neutral spec into the chosen target's output. */
export function emit(spec: ChartSpec, target: Target): Output {
  switch (target) {
    case "vega-lite":
      return { target, format: "json", body: toVegaLite(spec) };
    case "echarts":
      return { target, format: "javascript", body: toEcharts(spec) };
    case "observable-plot":
      return { target, format: "javascript", body: toObservablePlot(spec) };
    case "plotly":
      return { target, format: "python", body: toPlotly(spec) };
    case "matplotlib":
    case "seaborn":
      return { target, format: "python", body: toPython(spec, target) };
    default:
      throw new Error(`Unknown export target "${target as string}". Choose one of: ${TARGETS.join(", ")}`);
  }
}

export interface ExportOptions {
  /** Reuse a profile you already computed (must come from the same rows). */
  profile?: DatasetProfile;
  /** Which of the profile's views to export, by rank (default 0, the best). */
  viewIndex?: number;
}

export interface Exported {
  recommendation: Recommendation;
  target: Target;
  /** The neutral spec the output was built from, when a chart could be exported. */
  spec?: ChartSpec;
  output?: Output;
  mapping?: Mapped;
  /** The view's caveats, the chart's known limits, and anything the data mapping derived. */
  caveats: Caveat[];
  /** Why nothing was exported, or which fallback chart was used. */
  message?: string;
}

/**
 * Profile rows, recommend a chart, and export it for another plotting library
 * instead of drawing it: the recommender decides, the target draws. Exports
 * only the charts the recommender can build today; a table or number answer
 * (or a chart this cannot express) comes back without `output` and says why.
 */
export function recommendAndExport(rows: Row[], target: Target, context?: Context, options: ExportOptions = {}): Exported {
  const profile = options.profile ?? profileDataset(rows);
  const index = options.viewIndex ?? 0;
  const all = recommend(profile, context, { top: index + 1 });
  const rec = all[index] ?? all[0];
  const view = profile.views.find((v) => v.id === rec.view.id);
  const result: Exported = { recommendation: rec, target, caveats: [...rec.caveats], message: rec.reason };
  if (rec.answer !== "chart" && !context?.forceChart) {
    result.message = rec.reason ?? "The best answer is not a chart; nothing to export.";
    return result;
  }
  const candidates = [rec.chart, ...rec.alternatives.filter((a) => a.built)].filter((c): c is Candidate => !!c && c.built);
  for (const cand of candidates) {
    const mapped = view ? mapView(cand.chart, rows, view, profile) : null;
    const spec = mapped ? toSpec(mapped) : null;
    if (!mapped || !spec) continue;
    const full: ChartSpec = { ...spec, title: rec.insight.statement };
    return {
      ...result,
      spec: full,
      output: emit(full, target),
      mapping: mapped,
      caveats: [...rec.caveats, ...mapped.notes],
      message: cand === rec.chart ? undefined : `The first choice could not be built from this data; exported ${cand.title.toLowerCase()} instead.`,
    };
  }
  result.message = "No chart could be built from this data; nothing to export.";
  return result;
}
