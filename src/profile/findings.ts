import type { Finding } from "./types.js";

/** Pure numeric helpers and finding builders. Each builder returns [] when nothing notable is found. */

const pct = (x: number) => `${Math.round(x * 100)}%`;
const r2dp = (x: number) => Number(x.toFixed(4));

export function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return sxx === 0 || syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
}

/** OLS of y on the index 0..n-1. */
export function linearTrend(y: number[]): { slope: number; r2: number } {
  const n = y.length;
  if (n < 3) return { slope: 0, r2: 0 };
  const x = y.map((_, i) => i);
  const r = pearson(x, y);
  const mx = (n - 1) / 2;
  const my = y.reduce((a, b) => a + b, 0) / n;
  const sxx = x.reduce((a, v) => a + (v - mx) ** 2, 0);
  const sxy = x.reduce((a, v, i) => a + (v - mx) * (y[i] - my), 0);
  return { slope: sxx === 0 ? 0 : sxy / sxx, r2: r * r };
}

export function autocorrelation(y: number[], lag: number): number {
  const n = y.length;
  if (lag < 1 || n < lag + 3) return 0;
  return pearson(y.slice(0, n - lag), y.slice(lag));
}

/** Trailing moving average of width `w`; the first w-1 points are dropped. */
export function movingAverage(y: number[], w: number): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < y.length; i++) {
    sum += y[i];
    if (i >= w) sum -= y[i - w];
    if (i >= w - 1) out.push(sum / w);
  }
  return out;
}

/** Findings for "one measure per category". `values` are per-category totals. */
export function categoryFindings(entries: { label: string; value: number }[], nonNegative: boolean): Finding[] {
  const out: Finding[] = [];
  const sorted = [...entries].sort((a, b) => b.value - a.value);
  const n = sorted.length;
  const total = sorted.reduce((a, e) => a + e.value, 0);
  if (nonNegative && total > 0 && n >= 4) {
    const k = Math.max(1, Math.ceil(n * 0.2));
    const topK = sorted.slice(0, k).reduce((a, e) => a + e.value, 0) / total;
    // Concentration is notable when the top fifth holds well over a fifth of the total.
    if (topK >= 0.5) {
      out.push({
        type: "concentration",
        strength: r2dp(Math.min(1, (topK - 0.2) / 0.6)),
        text: `The top ${k} of ${n} categories account for ${pct(topK)} of the total`,
        detail: { k, n, topShare: r2dp(topK) },
      });
    }
    const top1 = sorted[0].value / total;
    if (top1 >= 0.35) {
      out.push({
        type: "dominant-category",
        strength: r2dp(Math.min(1, top1)),
        text: `${sorted[0].label} alone is ${pct(top1)} of the total`,
        detail: { label: sorted[0].label, share: r2dp(top1) },
      });
    }
  }
  const lo = sorted[n - 1].value;
  const hi = sorted[0].value;
  if (lo > 0 && hi / lo >= 3) {
    out.push({
      type: "spread",
      strength: r2dp(Math.min(1, Math.log10(hi / lo) / 2)),
      text: `${sorted[0].label} is ${(hi / lo).toFixed(1)}x ${sorted[n - 1].label}`,
      detail: { ratio: r2dp(hi / lo), high: sorted[0].label, low: sorted[n - 1].label },
    });
  }
  return out;
}

/** Findings for a series ordered in time. `lag` is the cycle length in points, or 0 if not cyclical. */
export function timeFindings(series: { label: string; value: number }[], lag: number): Finding[] {
  const out: Finding[] = [];
  const y = series.map((s) => s.value);
  const n = y.length;
  if (n < 3) return out;
  // With a repeating cycle, judge the trend on a moving average one cycle wide: otherwise a strong
  // seasonal swing eats the R^2 and a clear upward drift is missed.
  const smooth = lag > 0 && n >= 2 * lag ? movingAverage(y, lag) : y;
  const { slope, r2 } = linearTrend(smooth);
  const mean = y.reduce((a, b) => a + b, 0) / n;
  const first = smooth[0];
  const last = smooth[smooth.length - 1];
  const change = first !== 0 ? (last - first) / Math.abs(first) : 0;
  if (r2 >= 0.5) {
    out.push({
      type: "trend",
      strength: r2dp(r2),
      text: `${slope > 0 ? "Rising" : "Falling"} steadily: ${pct(Math.abs(change))} ${change >= 0 ? "up" : "down"} over the period${smooth !== y ? " (cycle smoothed out)" : ""}`,
      detail: { direction: slope > 0 ? "up" : "down", r2: r2dp(r2), changePct: r2dp(change) },
    });
  }
  if (lag > 0) {
    // Detrend before testing for a repeating cycle, otherwise any trend looks seasonal.
    const rawSlope = linearTrend(y).slope;
    const detr = y.map((v, i) => v - (mean + rawSlope * (i - (n - 1) / 2)));
    const ac = autocorrelation(detr, lag);
    if (ac >= 0.5) {
      out.push({
        type: "seasonality",
        strength: r2dp(Math.min(1, ac)),
        text: `A repeating cycle of ${lag} periods (autocorrelation ${ac.toFixed(2)} after removing the trend)`,
        detail: { lag, autocorrelation: r2dp(ac) },
      });
    }
  }
  let big = 0;
  let bigAt = 1;
  for (let i = 1; i < n; i++) {
    const d = Math.abs(y[i] - y[i - 1]);
    if (d > big) {
      big = d;
      bigAt = i;
    }
  }
  const scale = Math.max(...y.map(Math.abs)) || 1;
  if (big / scale >= 0.25) {
    out.push({
      type: "biggest-change",
      strength: r2dp(Math.min(1, big / scale)),
      text: `The largest move is ${series[bigAt - 1].label} to ${series[bigAt].label}`,
      detail: { from: series[bigAt - 1].label, to: series[bigAt].label, size: r2dp(big) },
    });
  }
  return out;
}

/**
 * Findings for several series ranked in each period. `ranks[series][period]` is 1 for the best; use NaN where a
 * series is absent. Reports who moved most between the first and last period and how often the lead changed.
 */
export function rankFindings(ranks: Record<string, number[]>, periods: string[]): Finding[] {
  const names = Object.keys(ranks);
  const n = periods.length;
  if (names.length < 3 || n < 3) return [];
  const first = (s: string) => ranks[s].find((r) => !Number.isNaN(r)) ?? NaN;
  const last = (s: string) => [...ranks[s]].reverse().find((r) => !Number.isNaN(r)) ?? NaN;
  let mover = names[0];
  let move = 0;
  for (const s of names) {
    const d = first(s) - last(s); // positive = climbed
    if (Math.abs(d) > Math.abs(move)) {
      move = d;
      mover = s;
    }
  }
  let leadChanges = 0;
  let prevLeader = "";
  for (let i = 0; i < n; i++) {
    const leader = names.find((s) => ranks[s][i] === 1);
    if (leader && prevLeader && leader !== prevLeader) leadChanges++;
    if (leader) prevLeader = leader;
  }
  if (move === 0 && leadChanges === 0) return [];
  const strength = Math.min(1, 0.5 * (Math.abs(move) / (names.length - 1)) + 0.5 * Math.min(1, (leadChanges * 3) / (n - 1)));
  const parts: string[] = [];
  if (move !== 0) parts.push(`${mover} ${move > 0 ? "climbed" : "fell"} from #${first(mover)} to #${last(mover)}`);
  parts.push(leadChanges === 0 ? "the lead never changed" : `the lead changed ${leadChanges} time${leadChanges === 1 ? "" : "s"}`);
  return [{ type: "rank-shift", strength: r2dp(strength), text: parts.join("; ").replace(/^./, (c) => c.toUpperCase()), detail: { mover, move, leadChanges } }];
}

export function relationshipFindings(x: number[], y: number[], xName: string, yName: string): Finding[] {
  const r = pearson(x, y);
  if (Math.abs(r) < 0.5) return [];
  return [
    {
      type: "correlation",
      strength: r2dp(Math.min(1, Math.abs(r))),
      text: `${xName} and ${yName} move ${r > 0 ? "together" : "in opposite directions"} (r = ${r.toFixed(2)})`,
      detail: { r: r2dp(r) },
    },
  ];
}
