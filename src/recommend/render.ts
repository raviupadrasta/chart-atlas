import { barChart } from "../charts/bar.js";
import { ecdfChart } from "../charts/ecdf.js";
import { histogramChart } from "../charts/histogram.js";
import { lineChart } from "../charts/line.js";
import { scatterChart } from "../charts/scatter.js";
import { bulletChart } from "../charts/bullet.js";
import { bumpChart } from "../charts/bump.js";
import { concentrationCurveChart } from "../charts/concentration-curve.js";
import { footballFieldChart } from "../charts/football-field.js";
import { seasonalOverlayChart } from "../charts/seasonal-overlay.js";
import { tornadoChart } from "../charts/tornado.js";
import { treemapChart } from "../charts/treemap.js";
import type { ChartInstance } from "../core/types.js";
import { profileDataset } from "../profile/index.js";
import type { Caveat, DatasetProfile, Row, View } from "../profile/types.js";
import { resolveTheme, type ThemeMode } from "../theme/tokens.js";
import { mapView, type Mapped } from "./map.js";
import { recommend } from "./recommend.js";
import type { Candidate, Context, Recommendation } from "./types.js";

type Factory = (el: HTMLElement, data: never, options?: never) => ChartInstance<never, never>;
const FACTORIES: Record<string, unknown> = {
  bar: barChart,
  line: lineChart,
  scatter: scatterChart,
  histogram: histogramChart,
  ecdf: ecdfChart,
  "concentration-curve": concentrationCurveChart,
  treemap: treemapChart,
  "seasonal-overlay": seasonalOverlayChart,
  bump: bumpChart,
  "football-field": footballFieldChart,
  tornado: tornadoChart,
  bullet: bulletChart,
};

export interface RenderOptions {
  theme?: ThemeMode | "auto";
  /** Wrap the chart in a figure with the insight as its title and the caveats as a caption (default true). */
  annotate?: boolean;
  /** Reuse a profile you already computed (must come from the same rows). */
  profile?: DatasetProfile;
  /** Which of the profile's views to render, by rank (default 0, the best). */
  viewIndex?: number;
}

export interface Rendered {
  recommendation: Recommendation;
  /** What was drawn: a chart, a table (data too small or no chart fits), or a plain number. */
  rendered: "chart" | "table" | "number";
  /** The chart's data and derived-data notes, when a chart was drawn. */
  mapping?: Mapped;
  instance?: ChartInstance<never, never>;
  /** Every caveat shown: the view's, the chart's known limits, and anything the data mapping derived. */
  caveats: Caveat[];
  /** Why a chart was not drawn, when it was not. */
  message?: string;
  /** Remove everything this call added to the container. */
  destroy(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, style: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.setAttribute("style", style);
  if (text !== undefined) e.textContent = text;
  return e;
}

function tableFor(rows: Row[], view: View, ink: string, grid: string): HTMLElement {
  const cols = [...new Set(Object.values(view.columns))];
  const data = view.values?.length
    ? view.values.map((v) => [v.label, String(v.value)])
    : rows.slice(0, 20).map((r) => cols.map((c) => String(r[c] ?? "")));
  const head = view.values?.length ? [view.columns.dimension ?? "", view.columns.measure ?? ""] : cols;
  const table = el("table", `border-collapse:collapse;font:13px system-ui,sans-serif;color:${ink}`);
  const thead = table.createTHead().insertRow();
  head.forEach((h) => thead.appendChild(el("th", `text-align:left;padding:4px 12px 4px 0;border-bottom:1px solid ${grid}`, h)));
  const body = table.createTBody();
  for (const r of data) {
    const tr = body.insertRow();
    r.forEach((c) => tr.appendChild(el("td", `padding:4px 12px 4px 0;font-variant-numeric:tabular-nums;border-bottom:1px solid ${grid}`, c)));
  }
  return table;
}

/**
 * Profile rows, recommend, and draw the answer into `container`: the chosen
 * chart when there is one, otherwise a table or a plain number. The insight is
 * the title and the caveats are the caption, so the chart never looks more
 * certain than its data. Returns the recommendation alongside what was drawn.
 */
export function recommendAndRender(container: HTMLElement, rows: Row[], context?: Context, options: RenderOptions = {}): Rendered {
  const profile = options.profile ?? profileDataset(rows);
  const all = recommend(profile, context, { top: (options.viewIndex ?? 0) + 1 });
  const rec = all[options.viewIndex ?? 0] ?? all[0];
  const view = profile.views.find((v) => v.id === rec.view.id);
  const theme = resolveTheme(options.theme ?? "auto");
  const annotate = options.annotate !== false;

  const figure = el("figure", "margin:0");
  container.appendChild(figure);
  const title = el("h3", `margin:0 0 8px;font:600 14px system-ui,sans-serif;color:${theme.ink.primary}`, rec.insight.statement);
  const host = el("div", "");
  const caption = el("figcaption", `margin-top:8px;font:12px system-ui,sans-serif;color:${theme.ink.secondary}`);
  if (annotate) figure.appendChild(title);
  figure.appendChild(host);

  let caveats: Caveat[] = [...rec.caveats];
  let instance: ChartInstance<never, never> | undefined;
  let mapping: Mapped | undefined;
  let rendered: Rendered["rendered"] = "table";
  let message: string | undefined = rec.reason;

  const tryCharts: Candidate[] = rec.answer === "chart" || context?.forceChart ? [rec.chart, ...rec.alternatives.filter((a) => a.built)].filter((c): c is Candidate => !!c && c.built) : [];
  for (const cand of tryCharts) {
    const m = view ? mapView(cand.chart, rows, view, profile) : null;
    const factory = FACTORIES[cand.chart] as Factory | undefined;
    if (!m || !factory) continue;
    instance = factory(host, m.data as never, { theme: options.theme ?? "auto", ...m.options } as never);
    mapping = m;
    rendered = "chart";
    caveats = [...caveats, ...m.notes];
    message = undefined;
    if (cand !== rec.chart) message = `The first choice could not be built from this data; drew ${cand.title.toLowerCase()} instead.`;
    break;
  }

  if (rendered !== "chart") {
    if (rec.answer === "number") {
      rendered = "number";
      host.appendChild(el("p", `margin:0;font:600 28px system-ui,sans-serif;color:${theme.ink.primary}`, rec.insight.statement));
    } else if (view) {
      host.appendChild(tableFor(rows, view, theme.ink.primary, theme.grid));
      if (rec.answer === "baseline-needed") message = rec.reason;
      else if (rec.answer === "chart") message = "No built chart could be drawn from this data; showing a table.";
    }
  }

  if (annotate) {
    const lines = [message, ...caveats.map((c) => c.text)].filter((t): t is string => !!t);
    lines.forEach((t, i) => caption.appendChild(el("div", i === 0 ? "" : "margin-top:2px", t)));
    if (lines.length) figure.appendChild(caption);
  }

  return {
    recommendation: rec,
    rendered,
    ...(mapping ? { mapping } : {}),
    ...(instance ? { instance } : {}),
    caveats,
    ...(message ? { message } : {}),
    destroy() {
      instance?.destroy();
      figure.remove();
    },
  };
}
