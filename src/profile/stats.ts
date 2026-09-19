import { mean, median, quantile, deviation } from "d3-array";
import type { CategoryCount, Granularity, NumericStats, TemporalStats } from "./types.js";

const DAY_MS = 86_400_000;

function round(n: number, dp = 6): number {
  return Number.isFinite(n) ? Number(n.toFixed(dp)) : 0;
}

export function numericStats(values: number[]): NumericStats {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const min = sorted[0];
  const max = sorted[n - 1];
  const mu = mean(sorted) ?? 0;
  const sd = deviation(sorted) ?? 0;
  const q1 = quantile(sorted, 0.25) ?? min;
  const q3 = quantile(sorted, 0.75) ?? max;
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  const outlierCount = iqr === 0 ? 0 : sorted.filter((v) => v < lo || v > hi).length;
  let skew = 0;
  if (n >= 3 && sd > 0) {
    const m3 = sorted.reduce((a, v) => a + ((v - mu) / sd) ** 3, 0);
    skew = (n / ((n - 1) * (n - 2))) * m3;
  }
  const allPositive = min > 0;
  return {
    min: round(min),
    max: round(max),
    mean: round(mu),
    median: round(median(sorted) ?? min),
    sd: round(sd),
    q1: round(q1),
    q3: round(q3),
    skew: round(skew, 4),
    outlierCount,
    nonNegative: min >= 0,
    allPositive,
    spansOrders: allPositive && max / min >= 100,
    hasSignChange: min < 0 && max > 0,
  };
}

/** [low, high] gap in days that counts as "one step" at each granularity. */
const STEP: Record<Exclude<Granularity, "sub-day" | "irregular">, [number, number]> = {
  day: [0.95, 1.05],
  week: [6.5, 7.5],
  month: [27.5, 31.5],
  quarter: [88, 93],
  year: [364, 366.5],
};

function classify(medianGapDays: number): Granularity {
  if (medianGapDays < 0.95) return "sub-day";
  for (const g of ["day", "week", "month", "quarter", "year"] as const) {
    const [lo, hi] = STEP[g];
    if (medianGapDays >= lo && medianGapDays <= hi) return g;
  }
  return "irregular";
}

export function temporalStats(dates: Date[]): TemporalStats {
  const times = [...new Set(dates.map((d) => d.getTime()))].sort((a, b) => a - b);
  const min = times[0];
  const max = times[times.length - 1];
  const spanDays = round((max - min) / DAY_MS, 3);
  if (times.length < 2) {
    return { min: new Date(min).toISOString(), max: new Date(max).toISOString(), spanDays, granularity: "irregular", regularity: 0 };
  }
  const gaps = times.slice(1).map((t, i) => (t - times[i]) / DAY_MS);
  const gran = classify(median(gaps) ?? gaps[0]);
  let regular: number;
  if (gran === "irregular") regular = 0;
  else if (gran === "sub-day") {
    const mg = median(gaps) ?? gaps[0];
    regular = gaps.filter((g) => Math.abs(g - mg) <= mg * 0.05).length / gaps.length;
  } else {
    const [lo, hi] = STEP[gran];
    regular = gaps.filter((g) => g >= lo && g <= hi).length / gaps.length;
  }
  return {
    min: new Date(min).toISOString(),
    max: new Date(max).toISOString(),
    spanDays,
    granularity: gran,
    regularity: round(regular, 3),
  };
}

export function topValues(values: string[], k = 8): CategoryCount[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, k)
    .map(([value, count]) => ({ value, count }));
}
