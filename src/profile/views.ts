import type { StructureFlag } from "../catalog/types.js";
import { categoryFindings, rankFindings, relationshipFindings, timeFindings } from "./findings.js";
import { isMissing, parseDate, parseNumber } from "./parse.js";
import type { Caveat, ColumnProfile, Finding, Row, View, ViewColumns, ViewKind } from "./types.js";

/** Candidate-view enumeration, per-view findings/caveats, and ranking. See docs/insight-taxonomy.md. */

const MIN_CATEGORIES = 2;
const MAX_CATEGORIES = 40;
const MAX_SERIES = 8;
const KIND_PRIORITY: Record<ViewKind, number> = {
  "measure-over-time": 0,
  "measure-by-category": 1,
  target: 2,
  range: 3,
  relationship: 4,
  distribution: 5,
};
const LOW_NAME = /^(low|min|lower|lo)$|_(low|min|lower|lo)$/i;
const HIGH_NAME = /^(high|max|upper|hi)$|_(high|max|upper|hi)$/i;
const BASE_NAME = /^(base|baseline|base_case|basecase)$|_(base|baseline)$/i;
const ACTUAL_NAME = /^(actual|value|current|ytd|result)$|_actual$/i;
const TARGET_NAME = /^(target|goal|budget|plan)$|_(target|goal|budget|plan)$/i;

const r4 = (x: number) => Number(x.toFixed(4));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

interface Ctx {
  rows: Row[];
  cols: Map<string, ColumnProfile>;
}

export const isAdditive = (c: ColumnProfile) => c.additive;

export function toNumber(v: unknown): number | null {
  if (isMissing(v)) return null;
  const p = parseNumber(v);
  return p ? p.value : null;
}

export function toTime(v: unknown, c: ColumnProfile): number | null {
  if (isMissing(v)) return null;
  const d = parseDate(v);
  if (d) return d.getTime();
  const n = parseNumber(v);
  if (n && Number.isInteger(n.value) && c.temporal?.granularity === "year") return Date.UTC(n.value, 0, 1);
  return null;
}

export function group<T>(items: T[], key: (t: T) => string | number): Map<string | number, T[]> {
  const m = new Map<string | number, T[]>();
  for (const it of items) {
    const k = key(it);
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }
  return m;
}

export function combine(values: number[], how: "sum" | "mean"): number {
  const s = values.reduce((a, b) => a + b, 0);
  return how === "sum" ? s : s / values.length;
}

export function isoLabel(ms: number, granularity?: string): string {
  const iso = new Date(ms).toISOString();
  if (granularity === "year") return iso.slice(0, 4);
  if (granularity === "month" || granularity === "quarter") return iso.slice(0, 7);
  return iso.slice(0, 10);
}

interface Parts {
  fit: number;
  signal: number;
  quality: number;
}

function finish(
  kind: ViewKind,
  columns: ViewColumns,
  n: number,
  aggregation: View["aggregation"],
  structure: StructureFlag[],
  findings: Finding[],
  caveats: Caveat[],
  parts: Parts,
  fitReason: string,
  dropShare: number,
): View {
  const score = 100 * (0.4 * parts.fit + 0.35 * parts.signal + 0.25 * parts.quality);
  const best = [...findings].sort((a, b) => b.strength - a.strength)[0];
  const reasons = [
    `fit ${parts.fit.toFixed(2)}: ${fitReason}`,
    best ? `signal ${parts.signal.toFixed(2)}: ${best.type}` : "signal 0.00: no strong pattern found",
    `quality ${parts.quality.toFixed(2)}: ${Math.round(dropShare * 100)}% of rows unusable for this view`,
  ];
  const id = `${kind}:${Object.entries(columns).map(([r, c]) => `${r}=${c}`).join("|")}`;
  return {
    id,
    kind,
    columns,
    n,
    aggregation,
    structure,
    findings: findings.sort((a, b) => b.strength - a.strength),
    caveats,
    score: r4(score),
    reasons,
  };
}

function droppedCaveat(share: number): Caveat[] {
  return share > 0.1
    ? [{ id: "missing-values", severity: "warn", rule: "T5", text: `${Math.round(share * 100)}% of rows have a missing value in these columns and were left out` }]
    : [];
}

function byCategory(ctx: Ctx, dim: ColumnProfile, meas: ColumnProfile): View | null {
  const pairs: { key: string; v: number }[] = [];
  for (const r of ctx.rows) {
    const v = toNumber(r[meas.name]);
    const raw = r[dim.name];
    if (v === null || isMissing(raw)) continue;
    pairs.push({ key: String(raw).trim(), v });
  }
  const groups = group(pairs, (p) => p.key);
  if (groups.size < MIN_CATEGORIES || groups.size > MAX_CATEGORIES) return null;
  const additive = isAdditive(meas);
  const repeated = pairs.length > groups.size;
  const how: "sum" | "mean" = additive ? "sum" : "mean";
  let entries = [...groups.entries()].map(([label, ps]) => ({ label: String(label), value: combine(ps.map((p) => p.v), how) }));
  entries = dim.order
    ? entries.sort((a, b) => dim.order!.indexOf(a.label) - dim.order!.indexOf(b.label))
    : entries.sort((a, b) => b.value - a.value);
  const n = entries.length;
  const nonNegative = entries.every((e) => e.value >= 0);
  const sum = entries.reduce((a, e) => a + e.value, 0);
  const sharesSum = meas.subtype === "proportion" && (Math.abs(sum - 1) <= 0.03 || Math.abs(sum - 100) <= 3);
  const partToWhole = nonNegative && (additive || sharesSum);
  const structure: StructureFlag[] = partToWhole ? ["partToWhole"] : [];
  const findings = categoryFindings(entries, partToWhole);
  const dropShare = 1 - pairs.length / ctx.rows.length;
  const caveats: Caveat[] = [...droppedCaveat(dropShare)];
  if (repeated) {
    caveats.push({
      id: "aggregated",
      severity: "info",
      rule: "R13",
      text: `${pairs.length} rows were combined into ${n} categories by ${how === "sum" ? "summing" : "averaging"} ${meas.name}`,
    });
    if (how === "mean") {
      caveats.push({ id: "mean-of-rows", severity: "info", rule: "T8", text: `${meas.name} is not additive, so it was averaged; check the rows are independent observations` });
    }
  }
  if (n <= 20 && findings.length === 0) {
    caveats.push({ id: "few-values", severity: "info", rule: "R39", text: `Only ${n} values and no strong pattern: a table may serve better than a chart` });
  }
  if (n > 15) caveats.push({ id: "many-categories", severity: "info", rule: "R11", text: `${n} categories: labels will crowd; consider showing the top few` });
  const fit = n >= 3 && n <= 15 ? 1 : n === 2 ? 0.4 : 0.65;
  const view = finish(
    "measure-by-category",
    { dimension: dim.name, measure: meas.name },
    n,
    repeated ? how : "none",
    structure,
    findings,
    caveats,
    { fit, signal: Math.max(0, ...findings.map((f) => f.strength)), quality: clamp01(1 - dropShare) },
    `${n} categories (3-15 reads best)`,
    dropShare,
  );
  view.values = entries.map((e) => ({ label: e.label, value: r4(e.value) }));
  return view;
}

const LAG: Record<string, number> = { month: 12, quarter: 4, week: 52, day: 7 };

function overTime(ctx: Ctx, time: ColumnProfile, meas: ColumnProfile, series?: ColumnProfile): View | null {
  const pairs: { t: number; v: number; s?: string }[] = [];
  for (const r of ctx.rows) {
    const v = toNumber(r[meas.name]);
    const t = toTime(r[time.name], time);
    if (v === null || t === null) continue;
    if (series) {
      if (isMissing(r[series.name])) continue;
      pairs.push({ t, v, s: String(r[series.name]).trim() });
    } else pairs.push({ t, v });
  }
  const byTime = group(pairs, (p) => p.t);
  if (byTime.size < 3) return null;
  const additive = isAdditive(meas);
  const how: "sum" | "mean" = additive ? "sum" : "mean";
  const times = [...byTime.keys()].map(Number).sort((a, b) => a - b);
  const gran = time.temporal?.granularity;
  const seriesData = times.map((t) => ({ label: isoLabel(t, gran), value: combine(byTime.get(t)!.map((p) => p.v), how) }));
  const lag = gran ? (LAG[gran] ?? 0) : 0;
  const n = times.length;
  const cyclical = lag > 0 && n >= 2 * lag;
  const structure: StructureFlag[] = ["timeSeries"];
  if (cyclical) structure.push("cyclical");
  if (series) {
    const bySeries = group(pairs, (p) => p.s!);
    const present = [...bySeries.values()].map((ps) => new Set(ps.map((p) => p.t)).size / n);
    // A series that shows up in under half the periods (e.g. rows that rotate through groups) is not a
    // real multi-series dataset; splitting by it would draw fragments.
    if (present.some((p) => p < 0.5)) return null;
    if (bySeries.size >= 3 && bySeries.size <= 12 && present.every((p) => p >= 0.8)) structure.push("rankOverTime");
  }
  const findings = timeFindings(seriesData, cyclical ? lag : 0);
  if (series && structure.includes("rankOverTime")) {
    const cells = [...group(pairs, (p) => `${p.t}|${p.s}`).values()].map((ps) => ({ t: ps[0].t, s: ps[0].s!, v: combine(ps.map((p) => p.v), how) }));
    const names = [...new Set(cells.map((c) => c.s))].sort();
    const ranks: Record<string, number[]> = Object.fromEntries(names.map((s) => [s, times.map(() => NaN)]));
    times.forEach((t, i) => {
      cells
        .filter((c) => c.t === t)
        .sort((a, b) => b.v - a.v || (a.s < b.s ? -1 : 1))
        .forEach((c, k) => {
          ranks[c.s][i] = k + 1;
        });
    });
    // A rank story replaces the trend of the pooled average, which says nothing about who overtook whom.
    const rf = rankFindings(ranks, seriesData.map((d) => d.label));
    if (rf.length) findings.splice(0, findings.length, ...rf);
  }
  const dropShare = 1 - pairs.length / ctx.rows.length;
  const caveats: Caveat[] = [...droppedCaveat(dropShare)];
  const regularity = time.temporal?.regularity ?? 0;
  if (regularity < 0.9) {
    caveats.push({ id: "irregular-time", severity: "warn", rule: "R6", text: "Time points are unevenly spaced or have gaps; a connected line implies continuity that the data may not have" });
  }
  if (n < 8) caveats.push({ id: "few-points", severity: "info", rule: "R39", text: `Only ${n} time points: a table or a dot plot may show them more honestly than a line` });
  if (findings.some((f) => f.type === "trend")) {
    caveats.push({ id: "time-not-cause", severity: "info", rule: "R40", text: "A steady trend describes what happened, not why; time is not an explanation" });
  }
  if (meas.unit === "currency" && (time.temporal?.spanDays ?? 0) >= 365 * 3) {
    caveats.push({ id: "nominal-money", severity: "info", rule: "R35", text: "Money over several years: state whether values are nominal or inflation-adjusted" });
  }
  if (pairs.length > n && !series) {
    caveats.push({ id: "aggregated", severity: "info", rule: "R13", text: `${pairs.length} rows were combined into ${n} time points by ${how === "sum" ? "summing" : "averaging"} ${meas.name}` });
  }
  const fit = (n >= 12 ? 1 : n >= 8 ? 0.8 : 0.5) * (regularity >= 0.9 ? 1 : 0.8);
  const columns: ViewColumns = { time: time.name, measure: meas.name };
  if (series) columns.series = series.name;
  return finish(
    "measure-over-time",
    columns,
    n,
    pairs.length > n && !series ? how : "none",
    structure,
    findings,
    caveats,
    { fit, signal: Math.max(0, ...findings.map((f) => f.strength)), quality: clamp01(1 - dropShare) },
    `${n} time points, regularity ${regularity.toFixed(2)}`,
    dropShare,
  );
}

function distribution(ctx: Ctx, meas: ColumnProfile): View | null {
  const vals = ctx.rows.map((r) => toNumber(r[meas.name])).filter((v): v is number => v !== null);
  const st = meas.numeric;
  if (!st || vals.length < 8 || st.sd === 0) return null;
  if (meas.subtype === "count" && meas.distinct <= 7) return null;
  const findings: Finding[] = [];
  if (Math.abs(st.skew) >= 1) {
    findings.push({ type: "skew", strength: r4(clamp01(Math.abs(st.skew) / 3)), text: `${st.skew > 0 ? "Right" : "Left"}-skewed (skew ${st.skew.toFixed(2)}): the mean and median tell different stories`, detail: { skew: st.skew } });
  }
  if (st.outlierCount > 0) {
    findings.push({ type: "outliers", strength: r4(clamp01(0.3 + (st.outlierCount / vals.length) * 3)), text: `${st.outlierCount} value(s) lie far outside the middle 50%`, detail: { count: st.outlierCount } });
  }
  const dropShare = 1 - vals.length / ctx.rows.length;
  const caveats: Caveat[] = [...droppedCaveat(dropShare)];
  if (vals.length < 30) caveats.push({ id: "small-sample", severity: "info", rule: "R27", text: `Only ${vals.length} values: show every observation rather than a summary` });
  if (st.spansOrders) caveats.push({ id: "log-axis", severity: "info", rule: "R10", text: "Values span several orders of magnitude: a labelled log axis may be warranted" });
  return finish(
    "distribution",
    { measure: meas.name },
    vals.length,
    "none",
    [],
    findings,
    caveats,
    { fit: vals.length >= 30 ? 1 : 0.6, signal: Math.max(0, ...findings.map((f) => f.strength)), quality: clamp01(1 - dropShare) },
    `${vals.length} observations (30 or more reads best)`,
    dropShare,
  );
}

function relationship(ctx: Ctx, a: ColumnProfile, b: ColumnProfile): View | null {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const r of ctx.rows) {
    const x = toNumber(r[a.name]);
    const y = toNumber(r[b.name]);
    if (x === null || y === null) continue;
    xs.push(x);
    ys.push(y);
  }
  if (xs.length < 8 || !a.numeric?.sd || !b.numeric?.sd) return null;
  const findings = relationshipFindings(xs, ys, a.name, b.name);
  const dropShare = 1 - xs.length / ctx.rows.length;
  const caveats: Caveat[] = [...droppedCaveat(dropShare)];
  if (findings.length) caveats.push({ id: "association-not-cause", severity: "info", rule: "V6", text: "A strong association does not show that one causes the other" });
  if (xs.length < 20) caveats.push({ id: "few-points", severity: "info", rule: "R27", text: `Only ${xs.length} points: the correlation is unstable` });
  return finish(
    "relationship",
    { x: a.name, y: b.name },
    xs.length,
    "none",
    [],
    findings,
    caveats,
    { fit: xs.length >= 20 ? 1 : 0.6, signal: Math.max(0, ...findings.map((f) => f.strength)), quality: clamp01(1 - dropShare) },
    `${xs.length} paired observations (20 or more reads best)`,
    dropShare,
  );
}

function rangeView(ctx: Ctx, dim: ColumnProfile, low: ColumnProfile, high: ColumnProfile, base?: ColumnProfile): View | null {
  const rows = ctx.rows
    .map((r) => ({ label: isMissing(r[dim.name]) ? null : String(r[dim.name]).trim(), lo: toNumber(r[low.name]), hi: toNumber(r[high.name]) }))
    .filter((r): r is { label: string; lo: number; hi: number } => r.label !== null && r.lo !== null && r.hi !== null);
  if (rows.length < 2 || rows.length > 30 || rows.filter((r) => r.lo <= r.hi).length / rows.length < 0.9) return null;
  const widest = [...rows].sort((a, b) => b.hi - b.lo - (a.hi - a.lo))[0];
  const findings: Finding[] = [
    { type: "widest-range", strength: 0.5, text: `${widest.label} has the widest range (${widest.lo} to ${widest.hi})`, detail: { label: widest.label, width: r4(widest.hi - widest.lo) } },
  ];
  const dropShare = 1 - rows.length / ctx.rows.length;
  return finish(
    "range",
    base ? { dimension: dim.name, low: low.name, high: high.name, base: base.name } : { dimension: dim.name, low: low.name, high: high.name },
    rows.length,
    "none",
    base ? ["hasInterval", "hasBase"] : ["hasInterval"],
    findings,
    droppedCaveat(dropShare),
    { fit: rows.length <= 12 ? 1 : 0.65, signal: 0.5, quality: clamp01(1 - dropShare) },
    `${rows.length} ranges (12 or fewer reads best)`,
    dropShare,
  );
}

function targetView(ctx: Ctx, dim: ColumnProfile, actual: ColumnProfile, target: ColumnProfile): View | null {
  const rows = ctx.rows
    .map((r) => ({ label: isMissing(r[dim.name]) ? null : String(r[dim.name]).trim(), a: toNumber(r[actual.name]), t: toNumber(r[target.name]) }))
    .filter((r): r is { label: string; a: number; t: number } => r.label !== null && r.a !== null && r.t !== null);
  if (rows.length < 1 || rows.length > 30) return null;
  const missed = rows.filter((r) => r.a < r.t);
  const share = missed.length / rows.length;
  const findings: Finding[] = [
    { type: "target-gap", strength: r4(clamp01(0.3 + Math.abs(share - 0.5))), text: `${missed.length} of ${rows.length} are below target`, detail: { below: missed.length, of: rows.length } },
  ];
  const dropShare = 1 - rows.length / ctx.rows.length;
  return finish(
    "target",
    { dimension: dim.name, actual: actual.name, target: target.name },
    rows.length,
    "none",
    ["hasTarget"],
    findings,
    droppedCaveat(dropShare),
    { fit: rows.length <= 15 ? 1 : 0.65, signal: findings[0].strength, quality: clamp01(1 - dropShare) },
    `${rows.length} metrics against targets`,
    dropShare,
  );
}

/** Enumerate every sensible view of the dataset, score it, and return them best first. */
export function buildViews(rows: Row[], columns: ColumnProfile[], opts: { pin?: string[]; maxViews?: number } = {}): View[] {
  if (rows.length === 0) return [];
  const ctx: Ctx = { rows, cols: new Map(columns.map((c) => [c.name, c])) };
  const dims = columns.filter((c) => (c.role === "nominal" || c.role === "ordinal") && c.distinct >= MIN_CATEGORIES && c.distinct <= MAX_CATEGORIES);
  const times = columns.filter((c) => c.role === "temporal" && c.temporal);
  const measures = columns.filter((c) => c.role === "quantitative");
  const seriesCols = dims.filter((c) => c.distinct >= 2 && c.distinct <= MAX_SERIES);
  const views: (View | null)[] = [];

  // Paired columns first: low/high(/base) and actual/target only mean something together. Once they form a
  // view, treating them again as free-standing measures (an "actual" summed by metric, "low" vs "high" as a
  // scatter) is noise, and can outrank the view that reads them correctly.
  const lows = measures.filter((c) => LOW_NAME.test(c.name));
  const highs = measures.filter((c) => HIGH_NAME.test(c.name));
  const bases = measures.filter((c) => BASE_NAME.test(c.name));
  const actuals = measures.filter((c) => ACTUAL_NAME.test(c.name));
  const targets = measures.filter((c) => TARGET_NAME.test(c.name));
  const consumed = new Set<string>();
  for (const d of dims) {
    for (const lo of lows) {
      for (const hi of highs) {
        if (lo === hi) continue;
        const v = rangeView(ctx, d, lo, hi);
        if (v) {
          views.push(v);
          consumed.add(lo.name).add(hi.name);
        }
        for (const b of bases) {
          const vb = rangeView(ctx, d, lo, hi, b);
          if (vb) {
            views.push(vb);
            consumed.add(b.name);
          }
        }
      }
    }
    for (const a of actuals) {
      for (const t of targets) {
        if (a === t) continue;
        const v = targetView(ctx, d, a, t);
        if (v) {
          views.push(v);
          consumed.add(a.name).add(t.name);
        }
      }
    }
  }
  const free = measures.filter((m) => !consumed.has(m.name));

  for (const d of dims) for (const m of free) views.push(byCategory(ctx, d, m));
  for (const t of times) {
    for (const m of free) {
      const split = seriesCols.map((s) => overTime(ctx, t, m, s));
      // Averaging different entities (teams, cities) into one line is not a real quantity, so when a series
      // column covers the periods and the measure is not additive, only the split view is offered.
      if (isAdditive(m) || split.every((v) => v === null)) views.push(overTime(ctx, t, m));
      views.push(...split);
    }
  }
  for (const m of free) views.push(distribution(ctx, m));
  for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) views.push(relationship(ctx, free[i], free[j]));

  let out = views.filter((v): v is View => v !== null);
  if (opts.pin?.length) out = out.filter((v) => opts.pin!.every((p) => Object.values(v.columns).includes(p)));
  // Ties go to the view that keeps more structure (a series split, a base case) since it can answer more questions.
  out.sort((a, b) => b.score - a.score || b.structure.length - a.structure.length || KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind] || (a.id < b.id ? -1 : 1));
  return out.slice(0, opts.maxViews ?? 12);
}
