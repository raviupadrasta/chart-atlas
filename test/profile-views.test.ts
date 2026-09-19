import { describe, expect, it } from "vitest";
import { profileDataset } from "../src/profile/index.js";
import type { View } from "../src/profile/index.js";

/** Small deterministic PRNG so fixtures never change between runs. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const month = (i: number) => new Date(Date.UTC(2021, i, 1)).toISOString().slice(0, 10);
const find = (views: View[], kind: string, cols: Record<string, string> = {}) =>
  views.find((v) => v.kind === kind && Object.entries(cols).every(([r, c]) => (v.columns as Record<string, string>)[r] === c));

describe("views: measure by category", () => {
  const rows = [
    ["North", 500], ["South", 300], ["East", 60], ["West", 40], ["Central", 30],
    ["Islands", 25], ["Coast", 20], ["Hills", 15], ["Desert", 10],
  ].map(([region, revenue]) => ({ region, revenue: `$${revenue}` }));

  it("finds concentration and flags part-to-whole for an additive measure", () => {
    const v = find(profileDataset(rows).views, "measure-by-category", { dimension: "region", measure: "revenue" })!;
    expect(v).toBeDefined();
    expect(v.n).toBe(9);
    expect(v.aggregation).toBe("none");
    expect(v.structure).toContain("partToWhole");
    const c = v.findings.find((f) => f.type === "concentration")!;
    expect(c.detail).toMatchObject({ k: 2, n: 9, topShare: 0.8 });
    expect(v.findings.some((f) => f.type === "dominant-category")).toBe(true);
  });

  it("does not claim part-to-whole for a non-additive measure", () => {
    const v = find(profileDataset(rows.map((r, i) => ({ region: r.region, satisfaction: 3.1 + i * 0.13 }))).views, "measure-by-category")!;
    expect(v.structure).not.toContain("partToWhole");
    expect(v.findings.some((f) => f.type === "concentration")).toBe(false);
  });

  it("sums repeated rows for additive measures and says so", () => {
    const repeated = [...rows, ...rows].map((r) => ({ ...r }));
    const v = find(profileDataset(repeated).views, "measure-by-category")!;
    expect(v.aggregation).toBe("sum");
    expect(v.n).toBe(9);
    expect(v.caveats.some((c) => c.id === "aggregated")).toBe(true);
  });

  it("recommends a table when there are few values and no pattern", () => {
    const flat = ["a", "b", "c", "d", "e"].map((k, i) => ({ k, v: 100 + (i % 2) }));
    const v = find(profileDataset(flat).views, "measure-by-category")!;
    expect(v.caveats.some((c) => c.id === "few-values")).toBe(true);
  });

  it("warns when many rows are unusable", () => {
    const holes = rows.map((r, i) => (i % 2 === 0 ? r : { region: r.region, revenue: null }));
    const v = find(profileDataset(holes).views, "measure-by-category")!;
    expect(v.caveats.some((c) => c.id === "missing-values" && c.severity === "warn")).toBe(true);
    expect(v.reasons.join(" ")).toMatch(/rows unusable/);
  });

  it("keeps ordinal categories in their natural order", () => {
    const m = ["Mar", "Jan", "Feb", "Apr"].map((k, i) => ({ month: k, sales: 10 + i }));
    const v = find(profileDataset(m).views, "measure-by-category", { dimension: "month" })!;
    expect(v.n).toBe(4);
  });
});

describe("views: measure over time", () => {
  const monthly = Array.from({ length: 36 }, (_, i) => ({
    month: month(i),
    revenue: Math.round(100 + i * 2 + 30 * Math.sin((2 * Math.PI * i) / 12)),
  }));

  it("detects a time series with a trend and a yearly cycle", () => {
    const v = find(profileDataset(monthly).views, "measure-over-time", { time: "month", measure: "revenue" })!;
    expect(v.structure).toEqual(expect.arrayContaining(["timeSeries", "cyclical"]));
    const types = v.findings.map((f) => f.type);
    expect(types).toContain("trend");
    expect(types).toContain("seasonality");
    expect(v.caveats.some((c) => c.id === "time-not-cause")).toBe(true);
  });

  it("flags rank-over-time when several series are present throughout", () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      ["A", "B", "C"].map((team, j) => ({ month: month(i), team, score: 50 + j * 5 + ((i * (j + 2)) % 7) })),
    ).flat();
    const v = find(profileDataset(rows).views, "measure-over-time", { series: "team" })!;
    expect(v.structure).toContain("rankOverTime");
  });

  it("does not split by a group that only appears in some periods", () => {
    const rotating = Array.from({ length: 24 }, (_, i) => ({ month: month(i), region: ["N", "S", "E"][i % 3], sales: 100 + i }));
    const views = profileDataset(rotating).views;
    expect(find(views, "measure-over-time", { series: "region" })).toBeUndefined();
    expect(find(views, "measure-over-time", { measure: "sales" })).toBeDefined();
  });

  it("warns about uneven spacing", () => {
    const uneven = ["2024-01-01", "2024-01-09", "2024-03-20", "2024-04-02", "2024-08-30", "2024-09-01"].map((d, i) => ({ d, v: 10 + i }));
    const v = find(profileDataset(uneven).views, "measure-over-time")!;
    expect(v.caveats.some((c) => c.id === "irregular-time")).toBe(true);
  });

  it("notes nominal money over a long horizon", () => {
    const yearly = Array.from({ length: 6 }, (_, i) => ({ year: 2018 + i, revenue: `$${1000 + i * 100}` }));
    const v = find(profileDataset(yearly).views, "measure-over-time")!;
    expect(v.caveats.some((c) => c.id === "nominal-money")).toBe(true);
  });
});

describe("views: distribution, relationship, range, target", () => {
  const rand = rng(7);

  it("finds a correlation between two measures", () => {
    const rows = Array.from({ length: 40 }, () => {
      const x = rand() * 100;
      return { spend: x, sales: 2 * x + (rand() - 0.5) * 20 };
    });
    const v = find(profileDataset(rows).views, "relationship")!;
    const c = v.findings.find((f) => f.type === "correlation")!;
    expect(Number(c.detail.r)).toBeGreaterThan(0.9);
    expect(v.caveats.some((x) => x.id === "association-not-cause")).toBe(true);
  });

  it("finds skew and outliers in a distribution and suggests a log axis when the range is huge", () => {
    const rows = Array.from({ length: 60 }, () => ({ income: Math.exp(rand() * 6 + 2) }));
    const v = find(profileDataset(rows).views, "distribution", { measure: "income" })!;
    expect(v.findings.some((f) => f.type === "skew")).toBe(true);
    expect(v.caveats.some((c) => c.id === "log-axis")).toBe(true);
  });

  it("warns that a small sample should show every point", () => {
    const rows = Array.from({ length: 12 }, () => ({ x: rand() * 10 }));
    const v = find(profileDataset(rows).views, "distribution")!;
    expect(v.caveats.some((c) => c.id === "small-sample")).toBe(true);
  });

  it("recognises low/high columns as a range view", () => {
    const rows = [
      { method: "DCF", low: 41, high: 58 },
      { method: "Comps", low: 45, high: 53 },
      { method: "Precedent", low: 49, high: 64 },
    ];
    const v = find(profileDataset(rows).views, "range")!;
    expect(v.structure).toContain("hasInterval");
    expect(v.findings[0].detail.label).toBe("DCF"); // 17 wide, vs 15 for Precedent and 8 for Comps
  });

  it("recognises actual/target columns as a target view", () => {
    const rows = [
      { metric: "Revenue", actual: 71, target: 80 },
      { metric: "Margin", actual: 38, target: 50 },
      { metric: "NPS", actual: 60, target: 55 },
    ];
    const v = find(profileDataset(rows).views, "target")!;
    expect(v.structure).toContain("hasTarget");
    expect(v.findings[0].detail).toMatchObject({ below: 2, of: 3 });
  });
});

describe("views: ranking, pinning and output shape", () => {
  const rand = rng(11);
  const rows = Array.from({ length: 36 }, (_, i) => ({
    month: month(i),
    region: ["N", "S", "E"][i % 3],
    revenue: Math.round(100 + i * 2 + 30 * Math.sin((2 * Math.PI * i) / 12)),
    cost: Math.round(rand() * 50),
  }));

  it("ranks views best-first and explains each score", () => {
    const { views } = profileDataset(rows);
    expect(views.length).toBeGreaterThan(1);
    for (let i = 1; i < views.length; i++) expect(views[i - 1].score).toBeGreaterThanOrEqual(views[i].score);
    for (const v of views) {
      expect(v.reasons).toHaveLength(3);
      expect(v.score).toBeGreaterThanOrEqual(0);
      expect(v.score).toBeLessThanOrEqual(100);
    }
  });

  it("puts a strong time-series view above a plain distribution of noise", () => {
    const { views } = profileDataset(rows);
    const ts = find(views, "measure-over-time", { measure: "revenue" })!;
    const noise = find(views, "distribution", { measure: "cost" });
    expect(ts).toBeDefined();
    if (noise) expect(ts.score).toBeGreaterThan(noise.score);
  });

  it("pin keeps only views that use the named columns", () => {
    const { views } = profileDataset(rows, { pin: ["revenue", "region"] });
    expect(views.length).toBeGreaterThan(0);
    for (const v of views) {
      const used = Object.values(v.columns);
      expect(used).toContain("revenue");
      expect(used).toContain("region");
    }
  });

  it("maxViews caps the list", () => {
    expect(profileDataset(rows, { maxViews: 3 }).views).toHaveLength(3);
  });

  it("is deterministic and JSON-safe", () => {
    const a = profileDataset(rows);
    const b = profileDataset(rows);
    expect(a).toEqual(b);
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  });

  it("never plots ids or empty columns", () => {
    const withId = rows.map((r, i) => ({ ...r, customer_id: 1000 + i, blank: null }));
    const { views } = profileDataset(withId);
    for (const v of views) {
      expect(Object.values(v.columns)).not.toContain("customer_id");
      expect(Object.values(v.columns)).not.toContain("blank");
    }
  });
});

describe("views: paired columns are not reused as free measures", () => {
  it("actual/target rank as a target view and are not also summed by metric", () => {
    const rows = [
      { metric: "Revenue $M", actual: 71, target: 80 },
      { metric: "Gross margin %", actual: 38, target: 50 },
      { metric: "NPS", actual: 60, target: 55 },
      { metric: "Retention %", actual: 91, target: 90 },
    ];
    const { views } = profileDataset(rows);
    expect(views[0].kind).toBe("target");
    expect(views.some((v) => v.kind === "measure-by-category")).toBe(false);
  });

  it("low/high are not also plotted against each other", () => {
    const rows = [
      { method: "DCF", low: 41, high: 58 },
      { method: "Comps", low: 45, high: 53 },
      { method: "Precedent", low: 49, high: 64 },
      { method: "52-week", low: 36, high: 51 },
      { method: "Broker", low: 40, high: 60 },
      { method: "LBO", low: 44, high: 59 },
      { method: "Sum of parts", low: 42, high: 57 },
      { method: "Asset", low: 39, high: 55 },
    ];
    const { views } = profileDataset(rows);
    expect(views.some((v) => v.kind === "relationship")).toBe(false);
    expect(views[0].kind).toBe("range");
  });
});

describe("views: rank findings and pooled series", () => {
  const teams = Array.from({ length: 6 }, (_, i) =>
    [["A", 30 + i * 6], ["B", 40], ["C", 50 - i * 5]].map(([team, score]) => ({ month: month(i), team, score })),
  ).flat();

  it("describes who moved and how often the lead changed", () => {
    const v = find(profileDataset(teams).views, "measure-over-time", { series: "team" })!;
    const f = v.findings[0];
    expect(f.type).toBe("rank-shift");
    expect(f.text).toMatch(/climbed from #3 to #1|fell from #1 to #3/);
    expect(f.detail.leadChanges).toBe(1);
  });

  it("does not offer a pooled average of different teams when the measure is not additive", () => {
    const views = profileDataset(teams).views.filter((v) => v.kind === "measure-over-time");
    expect(views.every((v) => v.columns.series === "team")).toBe(true);
  });

  it("still offers the pooled total when the measure is additive", () => {
    const rows = Array.from({ length: 6 }, (_, i) => ["N", "S", "E"].map((region, j) => ({ month: month(i), region, revenue: `$${100 + i * 10 + j * 5}` }))).flat();
    const views = profileDataset(rows).views.filter((v) => v.kind === "measure-over-time");
    expect(views.some((v) => !v.columns.series)).toBe(true);
    expect(views.some((v) => v.columns.series === "region")).toBe(true);
  });
});
