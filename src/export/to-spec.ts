import type { BulletData } from "../charts/bullet.js";
import type { BumpData } from "../charts/bump.js";
import type { FootballFieldData } from "../charts/football-field.js";
import type { SeasonalOverlayData } from "../charts/seasonal-overlay.js";
import type { TornadoData } from "../charts/tornado.js";
import type { TreemapData } from "../charts/treemap.js";
import type { Mapped } from "../recommend/map.js";
import type { ChartSpec, Datum, Layer } from "./spec.js";
import { rowChartHeight, STYLE } from "./style.js";

const XY = { width: STYLE.space.width, height: STYLE.space.plotHeight };

/** Cumulative share of the metric against cumulative share of the population, largest first. */
function concentration(data: number[], options: Mapped["options"]): ChartSpec {
  const sorted = data.filter((v) => v > 0).sort((a, b) => b - a);
  const total = sorted.reduce((a, b) => a + b, 0);
  let run = 0;
  const curve: Datum[] = [{ x: 0, y: 0 }, ...sorted.map((v, i) => ({ x: (i + 1) / sorted.length, y: (run += v) / total }))];
  const metric = String(options.metricLabel ?? "the metric");
  const population = String(options.populationLabel ?? "the population");
  return {
    chart: "concentration-curve",
    title: `Cumulative share of ${metric} by ${population}, largest first`,
    notes: [],
    x: { kind: "linear", title: `Cumulative share of ${population}`, zero: true },
    y: { kind: "linear", title: `Cumulative share of ${metric}`, zero: true },
    layers: [
      { mark: "line", data: [{ x: 0, y: 0 }, { x: 1, y: 1 }], dash: true, tone: "muted" },
      { mark: "line", data: curve, tone: "accent", thick: true },
    ],
    size: XY,
  };
}

function treemapAsBars(data: TreemapData): ChartSpec {
  const parts = [...(data.children ?? [])].filter((c) => typeof c.value === "number").sort((a, b) => (b.value as number) - (a.value as number));
  return {
    chart: "treemap",
    title: `${data.name} by part, largest first`,
    notes: [],
    x: { kind: "linear", title: data.name, zero: true },
    y: { kind: "category", order: parts.map((p) => p.name) },
    layers: [{ mark: "range", data: parts.map((p) => ({ y: p.name, x0: 0, x1: p.value as number })), tone: "accent" }],
    size: { width: STYLE.space.width, height: rowChartHeight(parts.length) },
    treemap: parts.map((p) => ({ name: p.name, value: p.value as number })),
    approximation: "Vega-Lite, Observable Plot, matplotlib, seaborn and Plotly have no treemap (ECharts does), so the parts are drawn as sorted bars (length is the more accurate encoding anyway).",
  };
}

function seasonalOverlay(data: SeasonalOverlayData, options: Mapped["options"]): ChartSpec {
  const labels = options.xTickLabels as string[] | undefined;
  const longest = Math.max(...data.map((d) => d.points.length));
  const order = labels ? labels.slice(0, longest) : Array.from({ length: longest }, (_, i) => String(i + 1));
  const rows = (d: (typeof data)[number]): Datum[] => d.points.map((v, i) => ({ x: order[i], y: v, series: d.label }));
  const history = data.filter((d) => d.emphasis !== "current");
  const current = data.filter((d) => d.emphasis === "current");
  const layers: Layer[] = [];
  if (typeof options.baselineValue === "number") layers.push({ mark: "rule", axis: "y", value: options.baselineValue, dash: true, tone: "muted" });
  layers.push({ mark: "line", data: history.flatMap(rows), tone: "muted" });
  layers.push({ mark: "line", data: current.flatMap(rows), tone: "accent", thick: true });
  return {
    chart: "seasonal-overlay",
    title: `Each cycle overlaid on the same calendar (latest: ${current[0]?.label ?? "n/a"})`,
    notes: [],
    x: { kind: "category", order },
    y: { kind: "linear", zero: false },
    layers,
    size: XY,
  };
}

function bump(data: BumpData): ChartSpec {
  const periods = [...new Set(data.points.map((p) => p.period))];
  const label = new Map(data.series.map((s) => [s.id, s.label]));
  const points: Datum[] = data.points.map((p) => ({ x: p.period, y: p.rank, series: label.get(p.seriesId) ?? p.seriesId }));
  return {
    chart: "bump",
    title: "Rank by period (1 = highest)",
    notes: [],
    x: { kind: "category", order: periods },
    y: { kind: "linear", title: "Rank", reverse: true, integer: true, zero: false },
    layers: [{ mark: "line", data: points, colorBySeries: true, thick: true }, { mark: "point", data: points, colorBySeries: true }],
    size: XY,
  };
}

function footballField(data: FootballFieldData): ChartSpec {
  return {
    chart: "football-field",
    title: "Range of estimates by method",
    notes: [],
    x: { kind: "linear", title: "Value", zero: false },
    y: { kind: "category", order: data.map((d) => d.label) },
    layers: [{ mark: "range", data: data.map((d) => ({ y: d.label, x0: d.low, x1: d.high })), tone: "accent" }],
    size: { width: STYLE.space.width, height: rowChartHeight(data.length) },
  };
}

function tornado(data: TornadoData): ChartSpec {
  const sorted = [...data].sort((a, b) => Math.abs(b.high - b.low) - Math.abs(a.high - a.low));
  const rows = (pick: (r: (typeof data)[number]) => [number, number]): Datum[] => sorted.map((r) => ({ y: r.label, x0: pick(r)[0], x1: pick(r)[1] }));
  return {
    chart: "tornado",
    title: "Swing from the base case, widest first",
    notes: [],
    x: { kind: "linear", title: "Outcome", zero: false },
    y: { kind: "category", order: sorted.map((r) => r.label) },
    layers: [
      { mark: "range", data: rows((r) => [r.base, r.low]), tone: "negative" },
      { mark: "range", data: rows((r) => [r.base, r.high]), tone: "positive" },
      { mark: "tick", data: sorted.map((r) => ({ y: r.label, x: r.base })), tone: "ink" },
    ],
    size: { width: STYLE.space.width, height: rowChartHeight(data.length) },
  };
}

function bullet(data: BulletData): ChartSpec {
  /** Nested bands from the axis origin, widest drawn first so the narrower ones sit on top. */
  const band = (edge: (r: (typeof data)[number], max: number) => number): Datum[] =>
    data.map((r) => ({ y: r.label, x0: 0, x1: edge(r, r.max ?? Math.max(r.ranges[1], r.actual, r.target)) }));
  return {
    chart: "bullet",
    title: "Actual against target (bands mark the qualitative ranges)",
    notes: [],
    x: { kind: "linear", title: "Value", zero: true },
    y: { kind: "category", order: data.map((r) => r.label) },
    layers: [
      { mark: "range", data: band((_, max) => max), tone: "bandLight" },
      { mark: "range", data: band((r) => r.ranges[1]), tone: "bandMid" },
      { mark: "range", data: band((r) => r.ranges[0]), tone: "bandDark" },
      { mark: "range", data: data.map((r) => ({ y: r.label, x0: 0, x1: r.actual })), tone: "accent", thin: true },
      { mark: "tick", data: data.map((r) => ({ y: r.label, x: r.target })), tone: "ink" },
    ],
    size: { width: STYLE.space.width, height: rowChartHeight(data.length, STYLE.space.bulletRowHeight) },
  };
}

/** Build a neutral chart spec from a recommender mapping; null for a chart this cannot express. */
export function toSpec(mapped: Mapped): ChartSpec | null {
  let spec: ChartSpec;
  switch (mapped.chart) {
    case "concentration-curve":
      spec = concentration(mapped.data as number[], mapped.options);
      break;
    case "treemap":
      spec = treemapAsBars(mapped.data as TreemapData);
      break;
    case "seasonal-overlay":
      spec = seasonalOverlay(mapped.data as SeasonalOverlayData, mapped.options);
      break;
    case "bump":
      spec = bump(mapped.data as BumpData);
      break;
    case "football-field":
      spec = footballField(mapped.data as FootballFieldData);
      break;
    case "tornado":
      spec = tornado(mapped.data as TornadoData);
      break;
    case "bullet":
      spec = bullet(mapped.data as BulletData);
      break;
    default:
      return null;
  }
  return { ...spec, notes: mapped.notes.map((n) => n.text) };
}
