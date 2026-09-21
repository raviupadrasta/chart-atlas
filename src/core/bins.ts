import { thresholdFreedmanDiaconis } from "d3-array";

export interface Bin {
  x0: number;
  x1: number;
  count: number;
}

const MIN_BINS = 5;
const MAX_BINS = 40;

/**
 * Equal-width histogram bins. The count comes from the Freedman-Diaconis rule
 * (it adapts to spread and sample size) clamped to 5..40, unless `bins` is
 * given. The charts and the exporters both call this so a histogram has the
 * same bars everywhere.
 */
export function histogramBins(values: number[], bins?: number): Bin[] {
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length === 0) return [];
  let lo = Infinity;
  let hi = -Infinity;
  for (const x of v) {
    if (x < lo) lo = x;
    if (x > hi) hi = x;
  }
  if (lo === hi) return [{ x0: lo - 0.5, x1: hi + 0.5, count: v.length }];
  const auto = thresholdFreedmanDiaconis(v, lo, hi);
  const n = Math.max(MIN_BINS, Math.min(MAX_BINS, Math.round(bins ?? (Number.isFinite(auto) ? auto : 10))));
  // Equal widths by construction (d3's own bin() rounds edges to "nice" ticks, which makes end bins narrower).
  const width = (hi - lo) / n;
  const out: Bin[] = Array.from({ length: n }, (_, i) => ({ x0: lo + i * width, x1: lo + (i + 1) * width, count: 0 }));
  for (const x of v) out[Math.min(n - 1, Math.floor((x - lo) / width))].count++;
  return out;
}

/** Sorted values with the share of observations at or below each: the ECDF as step corners. */
export function ecdfSteps(values: number[]): [number, number][] {
  const v = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  const n = v.length;
  const out: [number, number][] = [];
  v.forEach((val, i) => {
    if (i + 1 < n && v[i + 1] === val) return; // ties: one step at the last of them
    out.push([val, (i + 1) / n]);
  });
  return out;
}
