import { describe, expect, it } from "vitest";
import { profileDataset } from "../src/profile/index.js";
import { FED_BY, MAPPABLE_CHARTS, mapView, recommendAndRender } from "../src/recommend/index.js";
import type { SeasonalOverlayData } from "../src/charts/seasonal-overlay.js";
import type { LineData } from "../src/charts/line.js";
import type { BumpData } from "../src/charts/bump.js";
import type { BulletData } from "../src/charts/bullet.js";
import { THEMES } from "../src/theme/tokens.js";

function mount(): HTMLDivElement {
  const div = document.createElement("div");
  document.body.appendChild(div);
  return div;
}
const month = (y: number, m: number) => new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);

const regional = [["North", 500], ["South", 300], ["East", 60], ["West", 40], ["Central", 30], ["Islands", 25], ["Coast", 20], ["Hills", 15], ["Desert", 10]].map(
  ([region, revenue]) => ({ region, revenue: `$${revenue}` }),
);
const seasonal = (start: number, count: number) =>
  Array.from({ length: count }, (_, i) => {
    const idx = start + i;
    return { month: month(2021 + Math.floor(idx / 12), idx % 12), revenue: Math.round(100 + idx * 2 + 30 * Math.sin((2 * Math.PI * idx) / 12)) };
  });

describe("recommendAndRender: end to end", () => {
  it("draws the recommended chart with the insight as title and caveats as caption, and cleans up after itself", () => {
    const el = mount();
    const out = recommendAndRender(el, regional, undefined, { theme: "light" });
    expect(out.rendered).toBe("chart");
    expect(out.recommendation.chart?.chart).toBe("concentration-curve");
    expect(out.mapping?.data).toEqual([500, 300, 60, 40, 30, 25, 20, 15, 10]);
    expect(el.querySelector("svg")).not.toBeNull();
    expect(el.querySelector("h3")?.textContent).toMatch(/top 2 of 9/);
    out.destroy();
    expect(el.innerHTML).toBe("");
  });

  it("draws a line chart for a monthly series, labelled by month", () => {
    const el = mount();
    const trend = Array.from({ length: 36 }, (_, i) => ({ month: month(2021, i), revenue: 100 + i * 3 + ((i * 7) % 5) }));
    const out = recommendAndRender(el, trend, undefined, { theme: "light" });
    expect(out.rendered).toBe("chart");
    expect(out.mapping?.chart).toBe("line");
    const data = out.mapping!.data as LineData;
    expect(data.x).toHaveLength(36);
    expect(data.x[0]).toBe("Jan 21");
    expect(data.series).toHaveLength(1);
    expect(data.series[0].label).toBe("revenue");
    expect(el.querySelector("polyline")).not.toBeNull();
  });

  it("maps a monthly series into one line per year for the seasonal overlay, marks the latest as current, and labels the months", () => {
    const rows = seasonal(0, 36);
    const p = profileDataset(rows);
    const view = p.views.find((v) => v.kind === "measure-over-time")!;
    const m = mapView("seasonal-overlay", rows, view, p)!;
    const data = m.data as SeasonalOverlayData;
    expect(data.map((d) => d.label)).toEqual(["2021", "2022", "2023"]);
    expect(data.every((d) => d.points.length === 12)).toBe(true);
    expect(data[2].emphasis).toBe("current");
    expect(data[0].emphasis).toBeUndefined();
    expect((m.options.xTickLabels as string[])[0]).toBe("Jan");
    expect(m.notes.some((c) => c.id === "raw-values")).toBe(true);
  });

  it("the seasonal overlay drops an incomplete first year and says so", () => {
    const rows = seasonal(3, 45); // April 2021 to December 2024
    const p = profileDataset(rows);
    const m = mapView("seasonal-overlay", rows, p.views.find((v) => v.kind === "measure-over-time")!, p)!;
    const data = m.data as SeasonalOverlayData;
    expect(data.map((d) => d.label)).toEqual(["2022", "2023", "2024"]);
    expect(m.notes.some((c) => c.id === "cycles-dropped")).toBe(true);
  });

  it("draws the seasonal overlay for a seasonal series", () => {
    const out = recommendAndRender(mount(), seasonal(0, 36), undefined, { theme: "light" });
    expect(out.rendered).toBe("chart");
    expect(out.mapping?.chart).toBe("seasonal-overlay");
  });

  it("the seasonal overlay refuses two cycles (too few to compare), so the line chart is drawn instead and the message says so", () => {
    const rows = seasonal(0, 24);
    const p = profileDataset(rows);
    const view = p.views.find((v) => v.kind === "measure-over-time")!;
    expect(mapView("seasonal-overlay", rows, view, p)).toBeNull();
    const out = recommendAndRender(mount(), rows, undefined, { theme: "light" });
    expect(out.rendered).toBe("chart");
    expect(out.mapping?.chart).toBe("line");
    expect(out.message).toMatch(/first choice could not be built/);
  });

  it("computes ranks per period from the values for the bump chart", () => {
    const rows = Array.from({ length: 6 }, (_, i) =>
      [["A", 30 + i * 6], ["B", 40], ["C", 50 - i * 5]].map(([team, score]) => ({ month: month(2024, i), team, score })),
    ).flat();
    const out = recommendAndRender(mount(), rows, undefined, { theme: "light" });
    expect(out.mapping?.chart).toBe("bump");
    const data = out.mapping!.data as BumpData;
    const rankOf = (team: string, period: string) => data.points.find((p) => p.seriesId === team && p.period === period)!.rank;
    expect(rankOf("C", "Jan")).toBe(1);
    expect(rankOf("A", "Jan")).toBe(3);
    expect(rankOf("A", "Jun")).toBe(1);
    expect(data.series.map((s) => s.colorIndex)).toEqual([0, 1, 2]);
  });

  it("draws a football field from low/high columns", () => {
    const out = recommendAndRender(mount(), [
      { method: "DCF", low: 41, high: 58 },
      { method: "Comps", low: 45, high: 53 },
      { method: "Precedent", low: 49, high: 64 },
    ], undefined, { theme: "light" });
    expect(out.mapping?.chart).toBe("football-field");
    expect(out.mapping?.data).toEqual([
      { label: "DCF", low: 41, high: 58 },
      { label: "Comps", low: 45, high: 53 },
      { label: "Precedent", low: 49, high: 64 },
    ]);
  });

  it("derives bullet bands from the target and says it did", () => {
    const out = recommendAndRender(mount(), [
      { metric: "Revenue", actual: 71, target: 80 },
      { metric: "Margin", actual: 38, target: 50 },
      { metric: "NPS", actual: 60, target: 55 },
    ], undefined, { theme: "light" });
    expect(out.mapping?.chart).toBe("bullet");
    const data = out.mapping!.data as BulletData;
    expect(data[0]).toMatchObject({ label: "Revenue", actual: 71, target: 80 });
    expect(data[0].ranges[0]).toBeCloseTo(56);
    expect(data[0].ranges[1]).toBeCloseTo(72);
    expect(out.caveats.some((c) => c.id === "derived-bands")).toBe(true);
    expect(out.recommendation.answer).toBe("chart");
  });

  it("shows a table when the recommendation is a table, and the chart when forced", () => {
    const flat = ["a", "b", "c", "d", "e"].map((k, i) => ({ k, v: 100 + (i % 2) }));
    const el = mount();
    const out = recommendAndRender(el, flat, undefined, { theme: "light" });
    expect(out.rendered).toBe("table");
    expect(el.querySelectorAll("tbody tr")).toHaveLength(5);
    expect(el.querySelector("svg")).toBeNull();
    const el2 = mount();
    expect(recommendAndRender(el2, flat, { forceChart: true }, { theme: "light" }).rendered).toBe("chart");
    expect(el2.querySelector("svg")).not.toBeNull();
  });

  it("shows a plain number for a two-value comparison", () => {
    const el = mount();
    const out = recommendAndRender(el, [{ team: "A", score: 10 }, { team: "B", score: 14 }], undefined, { theme: "light" });
    expect(out.rendered).toBe("number");
    expect(el.textContent).toMatch(/B is 14; A is 10/);
    expect(el.querySelector("svg")).toBeNull();
  });

  it("draws a scatter plot for two related measures, labelled with the column names", () => {
    let seed = 5;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const rows = Array.from({ length: 40 }, () => {
      const x = rand() * 100;
      return { spend: x, sales: 2 * x + (rand() - 0.5) * 20 };
    });
    const el = mount();
    const out = recommendAndRender(el, rows, undefined, { theme: "light" });
    expect(out.rendered).toBe("chart");
    expect(out.mapping?.chart).toBe("scatter");
    expect(el.querySelectorAll("circle")).toHaveLength(40);
    expect(new Set([out.mapping!.options.xLabel, out.mapping!.options.yLabel])).toEqual(new Set(["spend", "sales"]));
  });

  it("draws a histogram for a distribution and an ECDF for a small one", () => {
    let seed = 9;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const big = recommendAndRender(mount(), Array.from({ length: 80 }, () => ({ income: Math.exp(rand() * 3) })), undefined, { theme: "light" });
    expect(big.mapping?.chart).toBe("histogram");
    expect((big.mapping!.data as number[]).length).toBe(80);
    const el = mount();
    const small = recommendAndRender(el, Array.from({ length: 15 }, () => ({ v: rand() * 10 })), undefined, { theme: "light" });
    expect(small.mapping?.chart).toBe("ecdf");
    expect(el.querySelector("path")).not.toBeNull();
  });

  it("draws bars for a category ranking, in the profiler's order", () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({ team: `T${i}`, sales: 10 + i * 7 }));
    const el = mount();
    const out = recommendAndRender(el, rows, undefined, { theme: "light" });
    expect(out.mapping?.chart).toBe("bar");
    expect((out.mapping!.data as { label: string }[]).map((r) => r.label)).toEqual(["T5", "T4", "T3", "T2", "T1", "T0"]);
    expect(el.querySelectorAll("rect").length).toBeGreaterThan(6);
  });

  it("draws several series as separate lines, capped at 5 with a note", () => {
    const rows = Array.from({ length: 12 }, (_, i) => Array.from({ length: 7 }, (_, j) => ({ month: month(2024, i), team: `T${j}`, score: 50 + j * 5 + ((i * (j + 2)) % 7) }))).flat();
    const p = profileDataset(rows);
    const view = p.views.find((v) => v.kind === "measure-over-time" && v.columns.series)!;
    const m = mapView("line", rows, view, p)!;
    expect((m.data as LineData).series).toHaveLength(5);
    expect(m.notes.some((n) => n.id === "top-series")).toBe(true);
  });

  it("annotate: false draws just the chart", () => {
    const el = mount();
    recommendAndRender(el, regional, undefined, { theme: "light", annotate: false });
    expect(el.querySelector("h3")).toBeNull();
    expect(el.querySelector("figcaption")).toBeNull();
    expect(el.querySelector("svg")).not.toBeNull();
  });

  it("passes the theme through to the chart", () => {
    const el = mount();
    recommendAndRender(el, regional, undefined, { theme: "dark" });
    expect(el.querySelector("svg rect")?.getAttribute("fill")).toBe(THEMES.dark.surface);
  });

  it("puts the chosen chart's own known issues in the caption", () => {
    const rows = [
      { method: "DCF", low: 41, high: 58 },
      { method: "Comps", low: 45, high: 53 },
      { method: "Precedent", low: 49, high: 64 },
    ];
    const out = recommendAndRender(mount(), rows, undefined, { theme: "light" });
    expect(out.mapping?.chart).toBe("football-field");
    expect(out.caveats.some((c) => c.id === "known-issue:football-field")).toBe(true);
  });
});

describe("mapView", () => {
  const rows = [
    { method: "DCF", low: 41, high: 58, base: 50 },
    { method: "Comps", low: 45, high: 53, base: 49 },
  ];
  it("maps low/high/base to a tornado and refuses a tornado without a base case", () => {
    const withBase = profileDataset(rows);
    const v = withBase.views.find((x) => x.kind === "range" && x.columns.base)!;
    expect(mapView("tornado", rows, v, withBase)?.data).toEqual([
      { label: "DCF", low: 41, high: 58, base: 50 },
      { label: "Comps", low: 45, high: 53, base: 49 },
    ]);
    const noBase = profileDataset(rows.map(({ method, low, high }) => ({ method, low, high })));
    const v2 = noBase.views.find((x) => x.kind === "range")!;
    expect(mapView("tornado", rows, v2, noBase)).toBeNull();
  });

  it("returns null for charts it has no adapter for", () => {
    const p = profileDataset(regional);
    expect(mapView("waterfall", regional, p.views[0], p)).toBeNull();
  });

  it("every mappable chart has a view-kind rule, and vice versa", () => {
    expect([...MAPPABLE_CHARTS].sort()).toEqual(Object.keys(FED_BY).sort());
  });
});
