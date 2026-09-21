import { describe, expect, it } from "vitest";
import { barChart } from "../src/charts/bar.js";
import { ecdfChart } from "../src/charts/ecdf.js";
import { histogramChart } from "../src/charts/histogram.js";
import { lineChart } from "../src/charts/line.js";
import { scatterChart } from "../src/charts/scatter.js";
import { ecdfSteps, histogramBins } from "../src/core/bins.js";

function mount(): HTMLDivElement {
  const div = document.createElement("div");
  document.body.appendChild(div);
  return div;
}
const num = (e: Element, a: string) => Number(e.getAttribute(a));

describe("barChart", () => {
  it("draws length proportional to value from a shared zero (lie factor 1)", () => {
    const el = mount();
    barChart(el, [{ label: "A", value: 100 }, { label: "B", value: 50 }, { label: "C", value: 25 }], { theme: "light" });
    const bars = [...el.querySelectorAll("rect")].filter((r) => num(r, "height") < 30 && num(r, "height") > 1);
    expect(bars).toHaveLength(3);
    const [a, b, c] = bars.map((r) => num(r, "width"));
    expect(a / b).toBeCloseTo(2, 5);
    expect(b / c).toBeCloseTo(2, 5);
    expect(new Set(bars.map((r) => num(r, "x"))).size).toBe(1);
  });

  it("puts a negative bar to the left of zero and keeps its value label clear of the category names", () => {
    const el = mount();
    barChart(el, [{ label: "Up", value: 30 }, { label: "Down", value: -10 }], { theme: "light" });
    const texts = [...el.querySelectorAll("text")];
    const neg = texts.find((t) => t.textContent === "-10" || t.textContent === "−10")!;
    const name = texts.find((t) => t.textContent === "Down")!;
    // Both are right-anchored: the name ends at its x, the label spans about 18 units left of its x.
    expect(num(neg, "x") - 18).toBeGreaterThan(num(name, "x"));
  });

  it("survives empty data and update()", () => {
    const el = mount();
    const c = barChart(el, [], { theme: "light" });
    expect(el.querySelector("svg")).not.toBeNull();
    c.update([{ label: "A", value: 1 }]);
    expect(el.querySelectorAll("text").length).toBeGreaterThan(0);
    c.destroy();
    expect(el.innerHTML).toBe("");
  });
});

describe("lineChart", () => {
  it("breaks the line at a missing value instead of drawing zero", () => {
    const el = mount();
    lineChart(el, { x: ["a", "b", "c", "d", "e"], series: [{ label: "S", values: [1, 2, null, 4, 5] }] }, { theme: "light" });
    expect(el.querySelectorAll("polyline")).toHaveLength(2);
  });

  it("keeps end labels apart when lines finish at nearly the same value", () => {
    const el = mount();
    lineChart(el, { x: ["a", "b"], series: [{ label: "One", values: [1, 10] }, { label: "Two", values: [2, 10.05] }, { label: "Three", values: [3, 10.1] }] }, { theme: "light" });
    const ys = ["One", "Two", "Three"].map((n) => num([...el.querySelectorAll("text")].find((t) => t.textContent === n)!, "y")).sort((a, b) => a - b);
    expect(ys[1] - ys[0]).toBeGreaterThanOrEqual(9.99);
    expect(ys[2] - ys[1]).toBeGreaterThanOrEqual(9.99);
  });

  it("copes with a constant series and with no data", () => {
    const el = mount();
    expect(() => lineChart(el, { x: ["a", "b", "c"], series: [{ label: "S", values: [5, 5, 5] }] }, { theme: "light" })).not.toThrow();
    expect(() => lineChart(mount(), { x: [], series: [] }, { theme: "light" })).not.toThrow();
  });
});

describe("scatterChart", () => {
  it("draws one dot per observation, and copes with all-equal values", () => {
    const el = mount();
    scatterChart(el, Array.from({ length: 12 }, (_, i) => ({ x: i, y: i * 2 })), { theme: "light" });
    expect(el.querySelectorAll("circle")).toHaveLength(12);
    expect(() => scatterChart(mount(), [{ x: 1, y: 1 }, { x: 1, y: 1 }], { theme: "light" })).not.toThrow();
    expect(() => scatterChart(mount(), [], { theme: "light" })).not.toThrow();
  });
});

describe("histogramBins", () => {
  it("makes equal-width bins that cover every value exactly once", () => {
    const values = Array.from({ length: 500 }, (_, i) => Math.sin(i) * 40 + 50);
    const bins = histogramBins(values);
    const widths = bins.map((b) => b.x1 - b.x0);
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1e-9);
    expect(bins.reduce((a, b) => a + b.count, 0)).toBe(500);
    expect(bins[0].x0).toBeCloseTo(Math.min(...values));
    expect(bins[bins.length - 1].x1).toBeCloseTo(Math.max(...values));
  });

  it("clamps the count to 5..40, honours an explicit count, and handles a constant or empty input", () => {
    expect(histogramBins(Array.from({ length: 20000 }, (_, i) => i)).length).toBeLessThanOrEqual(40);
    expect(histogramBins([1, 2, 3, 4, 5, 6, 7, 8]).length).toBeGreaterThanOrEqual(5);
    expect(histogramBins(Array.from({ length: 100 }, (_, i) => i), 12)).toHaveLength(12);
    expect(histogramBins([7, 7, 7])).toEqual([{ x0: 6.5, x1: 7.5, count: 3 }]);
    expect(histogramBins([])).toEqual([]);
  });

  it("puts the maximum in the last bin, not one past it", () => {
    const bins = histogramBins([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5);
    expect(bins[4].count).toBeGreaterThan(0);
    expect(bins.reduce((a, b) => a + b.count, 0)).toBe(11);
  });
});

describe("ecdfSteps", () => {
  it("returns sorted values with the share at or below each, one step per distinct value", () => {
    expect(ecdfSteps([3, 1, 2, 2])).toEqual([[1, 0.25], [2, 0.75], [3, 1]]);
    expect(ecdfSteps([])).toEqual([]);
  });
});

describe("histogramChart and ecdfChart", () => {
  it("histogram bar heights are proportional to counts and start at zero", () => {
    const el = mount();
    histogramChart(el, [1, 1, 1, 1, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 5, 5, 5, 5, 6, 6, 7, 7, 8], { theme: "light", bins: 8 });
    const bins = histogramBins([1, 1, 1, 1, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 5, 5, 5, 5, 6, 6, 7, 7, 8], 8);
    const bars = [...el.querySelectorAll("rect")].filter((r) => num(r, "height") > 0 && num(r, "width") < 100 && num(r, "y") > 5);
    expect(bars.length).toBe(bins.filter((b) => b.count > 0).length);
    const tallest = Math.max(...bars.map((r) => num(r, "height")));
    const max = Math.max(...bins.map((b) => b.count));
    bars.forEach((r, i) => expect(num(r, "height") / tallest).toBeCloseTo(bins.filter((b) => b.count > 0)[i].count / max, 5));
    expect(() => histogramChart(mount(), [], { theme: "light" })).not.toThrow();
  });

  it("ecdf draws a single path and copes with one value and no data", () => {
    const el = mount();
    ecdfChart(el, [3, 1, 2, 2, 5], { theme: "light" });
    expect(el.querySelectorAll("path")).toHaveLength(1);
    expect(() => ecdfChart(mount(), [4], { theme: "light" })).not.toThrow();
    expect(() => ecdfChart(mount(), [], { theme: "light" })).not.toThrow();
  });
});
