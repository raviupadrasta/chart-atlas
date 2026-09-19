import type { BumpData } from "../charts/bump.js";
import type { BulletData } from "../charts/bullet.js";
import type { FootballFieldData } from "../charts/football-field.js";
import type { SeasonalOverlayData } from "../charts/seasonal-overlay.js";
import type { TornadoData } from "../charts/tornado.js";
import type { TreemapData } from "../charts/treemap.js";
import { combine, group, isAdditive, isoLabel, toNumber, toTime } from "../profile/views.js";
import { isMissing } from "../profile/parse.js";
import type { Caveat, ColumnProfile, DatasetProfile, Row, View, ViewKind } from "../profile/types.js";

/**
 * Adapters from a profiler view to a built chart's data shape. Each returns
 * null when the view cannot honestly feed that chart, plus notes that become
 * caveats (for example, anything the adapter had to derive or drop).
 */
export interface Mapped {
  chart: string;
  data: unknown;
  options: Record<string, unknown>;
  notes: Caveat[];
}

const note = (id: string, text: string, rule = "R13"): Caveat => ({ id, severity: "info", rule, text });
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_SERIES_COLORS = 8;

interface Ctx {
  rows: Row[];
  col: (name: string | undefined) => ColumnProfile | undefined;
}

/** Aggregated value per time point (summed if additive, averaged otherwise), oldest first, plus how it was combined. */
function timeSeriesOf(ctx: Ctx, view: View): { t: number; v: number }[] | null {
  const time = ctx.col(view.columns.time);
  const meas = ctx.col(view.columns.measure);
  if (!time || !meas) return null;
  const pairs: { t: number; v: number }[] = [];
  for (const r of ctx.rows) {
    const v = toNumber(r[meas.name]);
    const t = toTime(r[time.name], time);
    if (v !== null && t !== null) pairs.push({ t, v });
  }
  const how = isAdditive(meas) ? "sum" : "mean";
  return [...group(pairs, (p) => p.t).entries()]
    .map(([t, ps]) => ({ t: Number(t), v: combine(ps.map((p) => p.v), how) }))
    .sort((a, b) => a.t - b.t);
}

function concentrationCurve(view: View): Mapped | null {
  if (!view.values?.length) return null;
  return {
    chart: "concentration-curve",
    data: view.values.map((v) => v.value),
    options: { metricLabel: view.columns.measure, populationLabel: view.columns.dimension },
    notes: [],
  };
}

function treemap(view: View): Mapped | null {
  if (!view.values?.length) return null;
  const data: TreemapData = { name: view.columns.measure ?? "total", children: view.values.map((v) => ({ name: v.label, value: v.value })) };
  return { chart: "treemap", data, options: {}, notes: [] };
}

const LAG: Record<string, number> = { month: 12, quarter: 4, week: 52, day: 7 };

function seasonalOverlay(ctx: Ctx, view: View): Mapped | null {
  const time = ctx.col(view.columns.time);
  const gran = time?.temporal?.granularity;
  const series = timeSeriesOf(ctx, view);
  if (!series || !gran || !LAG[gran]) return null;
  const t0 = series[0].t;
  const keyOf = (t: number) => (gran === "day" ? Math.floor((t - t0) / (7 * 86_400_000)) : new Date(t).getUTCFullYear());
  const cycles = [...group(series, (p) => keyOf(p.t)).entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
  const expected = LAG[gran] === 52 ? Math.max(...cycles.map(([, ps]) => ps.length)) : LAG[gran];
  const notes: Caveat[] = [];
  const kept = cycles.filter(([, ps], i) => ps.length === expected || i === cycles.length - 1);
  const dropped = cycles.length - kept.length;
  if (dropped > 0) notes.push(note("cycles-dropped", `${dropped} incomplete cycle(s) at the start were left out so every line covers the same span`));
  if (kept.length < 3) return null;
  const data: SeasonalOverlayData = kept.map(([k, ps], i) => ({
    label: gran === "day" ? `Week of ${isoLabel(ps[0].t)}` : String(k),
    points: ps.map((p) => p.v),
    ...(i === kept.length - 1 ? { emphasis: "current" as const } : {}),
  }));
  const last = kept[kept.length - 1][1];
  if (last.length < expected) notes.push(note("current-partial", `The current cycle is partial (${last.length} of ${expected} points), so it is compared with history only so far`));
  const firsts = data.map((d) => d.points[0]);
  const baselineValue = firsts.reduce((a, b) => a + b, 0) / firsts.length;
  notes.push(note("raw-values", "Values are plotted as recorded (not indexed to 100); the reference line marks the average starting value"));
  let xTickLabels: string[] | undefined;
  if (gran === "month") xTickLabels = MONTHS;
  else if (gran === "quarter") xTickLabels = ["Q1", "Q2", "Q3", "Q4"];
  else if (gran === "day") {
    const d0 = new Date(kept[0][1][0].t).getUTCDay();
    xTickLabels = Array.from({ length: 7 }, (_, i) => WEEKDAYS[(d0 + i) % 7]);
  }
  return { chart: "seasonal-overlay", data, options: { baselineValue, ...(xTickLabels ? { xTickLabels } : {}) }, notes };
}

function bump(ctx: Ctx, view: View): Mapped | null {
  const time = ctx.col(view.columns.time);
  const meas = ctx.col(view.columns.measure);
  const seriesCol = ctx.col(view.columns.series);
  if (!time || !meas || !seriesCol) return null;
  const rows: { t: number; s: string; v: number }[] = [];
  for (const r of ctx.rows) {
    const v = toNumber(r[meas.name]);
    const t = toTime(r[time.name], time);
    if (v === null || t === null || isMissing(r[seriesCol.name])) continue;
    rows.push({ t, v, s: String(r[seriesCol.name]).trim() });
  }
  const how = isAdditive(meas) ? "sum" : "mean";
  const cells = [...group(rows, (r) => `${r.t}|${r.s}`).values()].map((rs) => ({ t: rs[0].t, s: rs[0].s, v: combine(rs.map((r) => r.v), how) }));
  const totals = [...group(cells, (c) => c.s).entries()].map(([s, cs]) => ({ s: String(s), mean: cs.reduce((a, c) => a + c.v, 0) / cs.length }));
  totals.sort((a, b) => b.mean - a.mean || (a.s < b.s ? -1 : 1));
  const notes: Caveat[] = [];
  let keep = totals.map((t) => t.s);
  if (keep.length > MAX_SERIES_COLORS) {
    keep = keep.slice(0, MAX_SERIES_COLORS);
    notes.push(note("top-series", `Only the ${MAX_SERIES_COLORS} series with the highest average ${meas.name} are shown, and ranks are among those`));
  }
  const keepSet = new Set(keep);
  const byPeriod = group(cells.filter((c) => keepSet.has(c.s)), (c) => c.t);
  const multiYear = new Set(cells.map((c) => new Date(c.t).getUTCFullYear())).size > 1;
  const points: BumpData["points"] = [];
  for (const [t, cs] of [...byPeriod.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))) {
    cs.sort((a, b) => b.v - a.v || (a.s < b.s ? -1 : 1)).forEach((c, i) => points.push({ seriesId: c.s, period: periodLabel(Number(t), time.temporal?.granularity, multiYear), rank: i + 1 }));
  }
  const data: BumpData = { series: keep.map((s, i) => ({ id: s, label: s, colorIndex: i })), points };
  notes.push(note("rank-from-values", `Ranks are computed from ${meas.name} in each period (1 = highest); ties are ordered by name`, "R13"));
  return { chart: "bump", data, options: {}, notes };
}

/** Compact axis label: "Jan" within one year, "Jan 24" across years, "2024" for yearly data. */
function periodLabel(ms: number, granularity: string | undefined, multiYear: boolean): string {
  const d = new Date(ms);
  if (granularity === "month") return multiYear ? `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}` : MONTHS[d.getUTCMonth()];
  if (granularity === "quarter") return `Q${Math.floor(d.getUTCMonth() / 3) + 1}${multiYear ? ` ${String(d.getUTCFullYear()).slice(2)}` : ""}`;
  return isoLabel(ms, granularity);
}

function rangeRows(ctx: Ctx, view: View) {
  const dim = view.columns.dimension;
  const lo = view.columns.low;
  const hi = view.columns.high;
  const base = view.columns.base;
  if (!dim || !lo || !hi) return null;
  const out: { label: string; low: number; high: number; base?: number }[] = [];
  for (const r of ctx.rows) {
    if (isMissing(r[dim])) continue;
    const l = toNumber(r[lo]);
    const h = toNumber(r[hi]);
    const b = base ? toNumber(r[base]) : null;
    if (l === null || h === null || (base && b === null)) continue;
    out.push({ label: String(r[dim]).trim(), low: l, high: h, ...(b !== null ? { base: b } : {}) });
  }
  return out;
}

function footballField(ctx: Ctx, view: View): Mapped | null {
  const rows = rangeRows(ctx, view);
  if (!rows?.length) return null;
  const data: FootballFieldData = rows.map(({ label, low, high }) => ({ label, low, high }));
  return { chart: "football-field", data, options: {}, notes: [] };
}

function tornado(ctx: Ctx, view: View): Mapped | null {
  const rows = rangeRows(ctx, view);
  if (!rows?.length || rows.some((r) => r.base === undefined)) return null;
  const data: TornadoData = rows.map((r) => ({ label: r.label, low: r.low, high: r.high, base: r.base as number }));
  return { chart: "tornado", data, options: {}, notes: [] };
}

function bullet(ctx: Ctx, view: View): Mapped | null {
  const { dimension, actual, target } = view.columns;
  if (!dimension || !actual || !target) return null;
  const data: BulletData = [];
  for (const r of ctx.rows) {
    if (isMissing(r[dimension])) continue;
    const a = toNumber(r[actual]);
    const t = toNumber(r[target]);
    if (a === null || t === null || t <= 0) continue;
    data.push({ label: String(r[dimension]).trim(), ranges: [t * 0.7, t * 0.9], actual: a, target: t });
  }
  if (!data.length) return null;
  return {
    chart: "bullet",
    data,
    options: {},
    notes: [note("derived-bands", "The poor / ok / good bands are not in the data: they are drawn at 70% and 90% of each target. Supply your own bands if you have them", "R38")],
  };
}

/** Map a view to the data shape of the chosen built chart. Returns null if the view cannot feed it. */
export function mapView(chartId: string, rows: Row[], view: View, profile: DatasetProfile): Mapped | null {
  const cols = new Map(profile.columns.map((c) => [c.name, c]));
  const ctx: Ctx = { rows, col: (n) => (n ? cols.get(n) : undefined) };
  switch (chartId) {
    case "concentration-curve":
      return concentrationCurve(view);
    case "treemap":
      return treemap(view);
    case "seasonal-overlay":
      return seasonalOverlay(ctx, view);
    case "bump":
      return bump(ctx, view);
    case "football-field":
      return footballField(ctx, view);
    case "tornado":
      return tornado(ctx, view);
    case "bullet":
      return bullet(ctx, view);
    default:
      return null;
  }
}

/** Which kinds of view each built chart can be fed from today; the recommender rejects a built chart outside this. */
export const FED_BY: Record<string, ViewKind[]> = {
  "concentration-curve": ["measure-by-category"],
  treemap: ["measure-by-category"],
  "seasonal-overlay": ["measure-over-time"],
  bump: ["measure-over-time"],
  "football-field": ["range"],
  tornado: ["range"],
  bullet: ["target"],
};

/** Chart ids mapView can feed today. */
export const MAPPABLE_CHARTS = ["concentration-curve", "treemap", "seasonal-overlay", "bump", "football-field", "tornado", "bullet"] as const;
