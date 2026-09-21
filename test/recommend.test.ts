import { describe, expect, it } from "vitest";
import { profileDataset } from "../src/profile/index.js";
import { recommend, type Recommendation } from "../src/recommend/index.js";

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
const top = (rows: Record<string, unknown>[], ctx?: Parameters<typeof recommend>[1]): Recommendation => recommend(profileDataset(rows), ctx, { top: 1 })[0];

const regional = [["North", 500], ["South", 300], ["East", 60], ["West", 40], ["Central", 30], ["Islands", 25], ["Coast", 20], ["Hills", 15], ["Desert", 10]].map(
  ([region, revenue]) => ({ region, revenue: `$${revenue}` }),
);
const seasonal = Array.from({ length: 36 }, (_, i) => ({ month: month(i), revenue: Math.round(100 + i * 2 + 30 * Math.sin((2 * Math.PI * i) / 12)) }));
const ranks = Array.from({ length: 12 }, (_, i) => ["A", "B", "C"].map((team, j) => ({ month: month(i), team, score: 50 + j * 5 + ((i * (j + 2)) % 7) }))).flat();

describe("recommend: golden answers", () => {
  it("concentrated part-to-whole data gets the concentration curve, with alternatives and a rejection", () => {
    const r = top(regional);
    expect(r.answer).toBe("chart");
    expect(r.insight.type).toBe("concentration");
    expect(r.insight.statement).toMatch(/top 2 of 9/);
    expect(r.chart?.chart).toBe("concentration-curve");
    expect(r.alternatives.map((a) => a.chart)).toEqual(expect.arrayContaining(["treemap", "bar"]));
    const marimekko = r.rejected.find((x) => x.chart === "marimekko");
    expect(marimekko?.because).toMatch(/hierarchy/);
  });

  it("a seasonal series gets the seasonal overlay (it is built for that finding), with the line as the plain alternative", () => {
    const r = top(seasonal);
    expect(r.chart?.chart).toBe("seasonal-overlay");
    expect(r.chart?.reasons.join(" ")).toMatch(/built to show the "seasonality"/);
    expect(r.alternatives.map((a) => a.chart)).toContain("line");
    expect(r.gaps).toEqual([]);
  });

  it("a trend with no cycle gets the plain line chart, not the seasonal overlay", () => {
    const r = top(Array.from({ length: 36 }, (_, i) => ({ month: month(i), revenue: 100 + i * 3 + ((i * 7) % 5) })));
    expect(r.chart?.chart).toBe("line");
    expect(r.chart?.reasons.join(" ")).not.toMatch(/built to show/);
  });

  it("reachability: every chart the profiler can feed wins on some dataset (adding a general chart must not bury a specialist one)", () => {
    const rand = rng(21);
    const winners = new Set<string>();
    const add = (rows: Record<string, unknown>[], ctx?: Parameters<typeof recommend>[1]) => recommend(profileDataset(rows), ctx, { top: 3 }).forEach((r) => r.chart && winners.add(r.chart.chart));
    for (const n of [3, 8, 16, 36, 40]) {
      add(Array.from({ length: n }, (_, i) => ({ k: `K${i}`, v: 100 + i * 3 })));
      add(Array.from({ length: n }, (_, i) => ({ k: `K${i}`, v: i === 0 ? 5000 : 30 + i })));
    }
    for (const n of [10, 25, 60]) {
      add(Array.from({ length: n }, () => ({ v: Math.exp(rand() * 4) })));
      add(Array.from({ length: n }, () => { const x = rand() * 100; return { a: x, b: 2 * x + rand() * 30 }; }));
    }
    add(seasonal);
    add(Array.from({ length: 36 }, (_, i) => ({ month: month(i), revenue: 100 + i * 3 + ((i * 7) % 5) })));
    add(ranks);
    add([{ m: "DCF", low: 41, high: 58, base: 50 }, { m: "Comps", low: 45, high: 53, base: 49 }, { m: "Prec", low: 49, high: 64, base: 57 }]);
    add([{ m: "Rev", actual: 71, target: 80 }, { m: "Mar", actual: 38, target: 50 }, { m: "NPS", actual: 60, target: 55 }]);
    const mustWin = ["bar", "line", "scatter", "histogram", "ecdf", "treemap", "concentration-curve", "seasonal-overlay", "bump", "football-field", "bullet"];
    for (const id of mustWin) expect(winners.has(id), `${id} never wins`).toBe(true);
  });

  it("several series present throughout get the bump chart for rank change", () => {
    const r = top(ranks);
    expect(r.insight.type).toBe("rank-change");
    expect(r.chart?.chart).toBe("bump");
    expect(r.insight.statement).toMatch(/lead changed|lead never changed|climbed|fell/);
  });

  it("a relationship with many points gets a scatter plot; the 2x2 matrices are rejected", () => {
    const rand = rng(7);
    const rows = Array.from({ length: 40 }, () => {
      const x = rand() * 100;
      return { spend: x, sales: 2 * x + (rand() - 0.5) * 20 };
    });
    const r = top(rows);
    expect(r.answer).toBe("chart");
    expect(r.chart?.chart).toBe("scatter");
    expect(r.rejected.map((x) => x.chart)).toEqual(expect.arrayContaining(["bcg-matrix", "impact-effort-matrix"]));
  });

  it("a skewed distribution gets a histogram, with an ECDF as the alternative", () => {
    const rand = rng(7);
    const r = top(Array.from({ length: 60 }, () => ({ income: Math.exp(rand() * 6 + 2) })));
    expect(r.answer).toBe("chart");
    expect(r.chart?.chart).toBe("histogram");
    expect(r.alternatives.map((a) => a.chart)).toContain("ecdf");
  });

  it("low/high/base columns give the football field, with the tornado as an alternative only when a base case exists", () => {
    const withBase = top([
      { method: "DCF", low: 41, high: 58, base: 50 },
      { method: "Comps", low: 45, high: 53, base: 49 },
      { method: "Precedent", low: 49, high: 64, base: 57 },
    ]);
    expect(withBase.chart?.chart).toBe("football-field");
    expect(withBase.alternatives.map((a) => a.chart)).toContain("tornado");
    const noBase = top([
      { method: "DCF", low: 41, high: 58 },
      { method: "Comps", low: 45, high: 53 },
      { method: "Precedent", low: 49, high: 64 },
    ]);
    expect(noBase.rejected.find((x) => x.chart === "tornado")?.because).toMatch(/hasBase/);
  });

  it("actual/target columns give the bullet chart", () => {
    const r = top([
      { metric: "Revenue", actual: 71, target: 80 },
      { metric: "Margin", actual: 38, target: 50 },
      { metric: "NPS", actual: 60, target: 55 },
    ]);
    expect(r.chart?.chart).toBe("bullet");
    expect(r.insight.type).toBe("variance-vs-target");
  });

  it("rejects a chart that cannot show negative values", () => {
    const r = top([
      { metric: "Revenue", actual: -71, target: 80 },
      { metric: "Margin", actual: 38, target: 50 },
      { metric: "NPS", actual: 60, target: 55 },
    ]);
    expect(r.rejected.find((x) => x.chart === "bullet")?.because).toMatch(/negative/);
  });

  it("a flat little dataset gets a table, but the chart is still offered and forceChart returns it as the answer", () => {
    const flat = ["a", "b", "c", "d", "e"].map((k, i) => ({ k, v: 100 + (i % 2) }));
    const r = top(flat);
    expect(r.answer).toBe("table");
    expect(r.reason).toMatch(/table/);
    expect(r.chart).toBeDefined();
    expect(top(flat, { forceChart: true }).answer).toBe("chart");
  });

  it("two values get a number, not a chart", () => {
    const r = top([{ team: "A", score: 10 }, { team: "B", score: 14 }]);
    expect(r.answer).toBe("number");
    expect(r.insight.statement).toMatch(/B is 14; A is 10/);
  });

  it("with no chartable view: one value is a number, anything else a table", () => {
    expect(recommend(profileDataset([{ total: 42 }]))[0].answer).toBe("number");
    expect(recommend(profileDataset([{ a: "x", b: "y" }, { a: "z", b: "w" }]))[0].answer).toBe("table");
    expect(recommend(profileDataset([]))[0].answer).toBe("table");
  });

  it("prefers a stronger encoding and says so: flat spend by department gets bars, and the treemap loses points (R1)", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ dept: `D${i}`, spend: 100 + i * i * 6 }));
    const r = top(rows);
    expect(r.chart?.chart).toBe("bar");
    const treemap = r.alternatives.find((a) => a.chart === "treemap");
    expect(treemap?.reasons.join(" ")).toMatch(/R1/);
    expect(treemap!.score).toBeLessThan(r.chart!.score);
  });

  it("few values get bars for a ranking, not a histogram or a distribution chart", () => {
    const r = top(Array.from({ length: 6 }, (_, i) => ({ team: `T${i}`, sales: 10 + i * 7 })));
    expect(r.chart?.chart).toBe("bar");
  });

  it("a histogram needs 30 values; 8 to 29 get the ECDF, which shows every point", () => {
    const rand = rng(3);
    const small = top(Array.from({ length: 20 }, () => ({ v: rand() * 10 })));
    expect(small.chart?.chart).toBe("ecdf");
    expect(small.rejected.find((x) => x.chart === "histogram")?.because).toMatch(/fewer than the 30/);
  });

  it("a rank story still gets the bump chart, not the line chart, even though the line is built", () => {
    const r = top(ranks);
    expect(r.chart?.chart).toBe("bump");
    expect(r.alternatives.map((a) => a.chart)).toContain("line");
  });
});

describe("recommend: guidance is overridable but never silently", () => {
  const metrics = (n: number) => Array.from({ length: n }, (_, i) => ({ metric: `M${i}`, actual: 50 + (i % 7) + i * 0.37, target: 55 }));
  // pin to the target view so the test is about the bullet chart's row limit, not about which view ranks first
  const topTarget = (rows: Record<string, unknown>[]) => recommend(profileDataset(rows, { pin: ["actual", "target"] }), undefined, { top: 1 })[0];

  it("a chart slightly over its usual row limit is still chosen, with the override stated", () => {
    const r = topTarget(metrics(18));
    expect(r.chart?.chart).toBe("bullet");
    expect(r.chart?.overrides.join(" ")).toMatch(/past the usual limit/);
    expect(r.caveats.some((c) => c.id === "guidance-override")).toBe(true);
    expect(r.chart!.parts.fit).toBeLessThan(1);
  });

  it("far over the limit it is rejected", () => {
    const r = topTarget(metrics(25));
    expect(r.rejected.find((x) => x.chart === "bullet")?.because).toMatch(/far past/);
  });
});

describe("recommend: context, questions and output shape", () => {
  it("records the defaults it assumed, and asks whether they are right", () => {
    const r = top(seasonal);
    expect(r.assumptions).toEqual({ purpose: "explain", audience: "expert", medium: "report", forceChart: false });
    expect(r.questionsForUser.some((q) => /Assumed/.test(q))).toBe(true);
    expect(r.questionsForUser[0]).toMatch(/How was revenue measured/);
  });

  it("does not ask about assumptions when a context is given", () => {
    const r = top(seasonal, { purpose: "monitor", audience: "executive", medium: "dashboard" });
    expect(r.questionsForUser.some((q) => /Assumed/.test(q))).toBe(false);
    expect(r.assumptions.audience).toBe("executive");
  });

  it("a specialist chart scores lower for a public audience than for an expert one", () => {
    const score = (audience: "expert" | "public") => top(seasonal, { audience }).chart!.score;
    const expert = score("expert");
    const pub = score("public");
    expect(pub).toBeLessThan(expert);
  });

  it("asks about independence when rows were aggregated", () => {
    const r = top([...regional, ...regional]);
    expect(r.questionsForUser.some((q) => /independent/.test(q))).toBe(true);
  });

  it("recommends for several top views and is deterministic and JSON-safe", () => {
    const p = profileDataset(seasonal);
    const a = recommend(p, undefined, { top: 3 });
    const b = recommend(p, undefined, { top: 3 });
    expect(a.length).toBeGreaterThan(1);
    expect(a).toEqual(b);
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  });

  it("every recommendation carries its view, reasons and the chart's own caveats", () => {
    for (const rows of [regional, seasonal, ranks]) {
      const r = top(rows);
      expect(r.view.id).toBeTruthy();
      if (r.chart) {
        expect(r.chart.reasons.length).toBeGreaterThan(2);
        expect(r.chart.score).toBeGreaterThan(0);
        expect(r.chart.score).toBeLessThanOrEqual(100);
      }
    }
  });
});
