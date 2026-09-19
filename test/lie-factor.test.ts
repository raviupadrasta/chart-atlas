// Renderer-level "lie factor" audit (docs/insight-taxonomy.md R34/R36, after
// Tufte): a mark's rendered size must be proportional to the value it encodes.
// Lie factor = (size ratio shown) / (value ratio in the data); 1 is honest and
// [0.95, 1.05] is the tolerance. Ratios are taken against the largest value so
// a single distorted baseline cannot hide behind a self-consistent scale.
//
// Known violations are written as `it.fails`: they pass while the defect
// exists and turn red when it is fixed, which is the cue to move the case to
// the passing group and update the catalog caveat.
import { describe, expect, it } from "vitest";
import * as atlas from "../src/index.js";

const LF_MIN = 0.95;
const LF_MAX = 1.05;

function mount(): HTMLDivElement {
  const div = document.createElement("div");
  document.body.appendChild(div);
  return div;
}

const num = (n: Element, attr: string) => Number(n.getAttribute(attr));

/** All <rect> marks, dropping the full-bleed background rect every chart draws first. */
function rects(el: Element) {
  return [...el.querySelectorAll("rect")].slice(1).map((r) => ({
    x: num(r, "x"),
    y: num(r, "y"),
    w: num(r, "width"),
    h: num(r, "height"),
    fill: r.getAttribute("fill"),
  }));
}

function circles(el: Element) {
  return [...el.querySelectorAll("circle")].map((c) => ({ r: num(c, "r") }));
}

/** Lie factor of each mark, relative to the mark with the largest value. */
function lieFactors(sizes: number[], values: number[]): number[] {
  const k = values.indexOf(Math.max(...values));
  return sizes.map((s, i) => s / sizes[k] / (values[i] / values[k]));
}

function expectProportional(sizes: number[], values: number[]) {
  lieFactors(sizes, values).forEach((lf, i) => {
    expect(lf, `mark ${i}: size ${sizes[i]} for value ${values[i]}`).toBeGreaterThanOrEqual(LF_MIN);
    expect(lf, `mark ${i}: size ${sizes[i]} for value ${values[i]}`).toBeLessThanOrEqual(LF_MAX);
  });
}

/** Angle (deg, clockwise from 12 o'clock) of the end point of a donut segment's outer arc. */
function arcSweep(d: string): number {
  const m = d.match(/^M([\d.-]+),([\d.-]+) A([\d.]+),[\d.]+ 0 [01] 1 ([\d.-]+),([\d.-]+)/);
  if (!m) throw new Error(`unrecognised arc path: ${d}`);
  const [cx, cy] = [Number(m[1]), Number(m[2]) + Number(m[3])]; // start is at 12 o'clock on the outer radius
  const dx = Number(m[4]) - cx;
  const dy = Number(m[5]) - cy;
  return ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
}

describe("lie factor: marks proportional to their values", () => {
  it("waterfallChart: bar heights track step size", () => {
    const el = mount();
    atlas.waterfallChart(
      el,
      [
        { label: "Start", value: 100, isTotal: true },
        { label: "a", value: 50 },
        { label: "b", value: -25 },
        { label: "End", value: 125, isTotal: true },
      ],
      { theme: "light" },
    );
    expectProportional(rects(el).map((r) => r.h), [100, 50, 25, 125]);
  });

  it("bulletChart: actual-value and band widths are on one linear scale", () => {
    const el = mount();
    atlas.bulletChart(
      el,
      [
        { label: "A", ranges: [40, 70], actual: 60, target: 80, max: 100 },
        { label: "B", ranges: [40, 70], actual: 30, target: 80, max: 100 },
      ],
      { theme: "light" },
    );
    const r = rects(el);
    // per row: 3 bands then the actual bar
    expectProportional([r[3].w, r[7].w], [60, 30]);
    expectProportional([r[0].w, r[1].w, r[2].w], [40, 30, 30]);
  });

  it("tornadoChart: each arm is proportional to its distance from the base case", () => {
    const el = mount();
    atlas.tornadoChart(
      el,
      [
        { label: "x", low: 80, high: 130, base: 100 },
        { label: "y", low: 90, high: 110, base: 100 },
        { label: "z", low: 99.9, high: 100.1, base: 100 },
      ],
      { theme: "light" },
    );
    const r = rects(el);
    expectProportional(
      r.map((m) => m.w),
      [20, 30, 10, 10, 0.1, 0.1],
    );
  });

  it("footballFieldChart: bar width is proportional to the range", () => {
    const el = mount();
    atlas.footballFieldChart(
      el,
      [
        { label: "x", low: 40, high: 60 },
        { label: "y", low: 50, high: 90 },
      ],
      { theme: "light" },
    );
    expectProportional(rects(el).map((r) => r.w), [20, 40]);
  });

  it("costCurveChart: height tracks cost per unit and width tracks volume", () => {
    const el = mount();
    atlas.costCurveChart(
      el,
      [
        { label: "a", cost: 10, volume: 20 },
        { label: "b", cost: 40, volume: 40 },
        { label: "c", cost: -20, volume: 10 },
      ],
      { theme: "light" },
    );
    const r = rects(el); // sorted by cost ascending: c, a, b
    expectProportional(r.map((m) => m.h), [20, 10, 40]);
    expectProportional(r.map((m) => m.w), [10, 20, 40]);
  });

  it("radialBadgeBarChart: bar height tracks |magnitude|", () => {
    const el = mount();
    atlas.radialBadgeBarChart(
      el,
      [
        { label: "a", magnitude: -10, duration: 100 },
        { label: "b", magnitude: -20, duration: 200 },
        { label: "c", magnitude: -40, duration: 50 },
      ],
      { theme: "light" },
    );
    expectProportional(rects(el).map((r) => r.h), [10, 20, 40]);
  });

  it("radialBadgeBarChart: ring sweep tracks duration; the longest ring is compressed by 3% (documented cap)", () => {
    const el = mount();
    atlas.radialBadgeBarChart(
      el,
      [
        { label: "a", magnitude: -10, duration: 100 },
        { label: "b", magnitude: -20, duration: 200 },
        { label: "c", magnitude: -40, duration: 50 },
      ],
      { theme: "light" },
    );
    const sweeps = [...el.querySelectorAll("path")].map((p) => arcSweep(p.getAttribute("d")!));
    expectProportional(sweeps, [100, 200, 50]);
    const lf = lieFactors(sweeps, [100, 200, 50]);
    expect(Math.min(...lf)).toBeGreaterThanOrEqual(0.96); // the cap costs ~3%, inside tolerance
  });

  it("treemapChart: tile area tracks value when every tile is a sizeable share", () => {
    const el = mount();
    atlas.treemapChart(el, { name: "r", children: [{ name: "a", value: 50 }, { name: "b", value: 30 }, { name: "c", value: 20 }] }, { theme: "light" });
    expectProportional(rects(el).map((r) => r.w * r.h), [50, 30, 20]);
  });

  it("marimekkoChart: column width tracks the column total and segment height tracks its share", () => {
    const el = mount();
    atlas.marimekkoChart(
      el,
      {
        name: "r",
        children: [
          { name: "c1", children: [{ name: "s1", value: 30 }, { name: "s2", value: 10 }] },
          { name: "c2", children: [{ name: "s1", value: 10 }, { name: "s2", value: 10 }] },
        ],
      },
      { theme: "light" },
    );
    const r = rects(el);
    expectProportional([r[0].w, r[2].w], [40, 20]);
    expectProportional([r[0].w * r[0].h, r[1].w * r[1].h, r[2].w * r[2].h, r[3].w * r[3].h], [30, 10, 10, 10]);
  });

  it("sankeyChart: node height tracks the flow through it", () => {
    const el = mount();
    atlas.sankeyChart(
      el,
      {
        nodes: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
          { id: "c", label: "C" },
        ],
        links: [
          { source: "a", target: "b", value: 80 },
          { source: "a", target: "c", value: 20 },
        ],
      },
      { theme: "light" },
    );
    expectProportional(rects(el).map((r) => r.h), [100, 80, 20]);
  });

  it("concentrationCurveChart: cumulative share is plotted on a linear 0-100 axis", () => {
    const el = mount();
    atlas.concentrationCurveChart(el, [50, 30, 10, 5, 5], { theme: "light" });
    const curve = [...el.querySelectorAll("path")].find((p) => p.getAttribute("fill") === "none")!;
    const ys = [...curve.getAttribute("d")!.matchAll(/(?:M|L)?[\d.-]+,([\d.-]+)/g)].map((m) => Number(m[1]));
    const [y0, ...rest] = ys;
    expectProportional(rest.map((y) => y0 - y), [50, 80, 90, 95, 100]);
  });

  it("seasonalOverlayChart: y position is linear in value", () => {
    const el = mount();
    // best/median/worst of these two are all straight lines with equal steps, so anchors must be evenly spaced
    atlas.seasonalOverlayChart(el, [{ label: "h1", points: [10, 20, 30, 40] }, { label: "h2", points: [20, 30, 40, 50] }] as never, { theme: "light" });
    const anchors = (d: string) =>
      d
        .split(/[MC]/)
        .filter(Boolean)
        .map((seg) => Number(seg.trim().split(/[\s,]+/).slice(-1)[0]));
    const paths = [...el.querySelectorAll("path")].map((p) => anchors(p.getAttribute("d")!)).filter((a) => a.length === 4);
    expect(paths.length).toBeGreaterThan(0);
    for (const ys of paths) {
      const steps = ys.slice(1).map((y, i) => ys[i] - y);
      steps.forEach((st) => expect(st / steps[0]).toBeGreaterThan(0.99));
      steps.forEach((st) => expect(st / steps[0]).toBeLessThan(1.01));
    }
  });
  it("bcgMatrixChart: bubble AREA is proportional to revenue", () => {
    const el = mount();
    atlas.bcgMatrixChart(
      el,
      [
        { label: "a", relativeShare: 1, marketGrowth: 5, revenue: 100 },
        { label: "b", relativeShare: 1, marketGrowth: 8, revenue: 400 },
      ],
      { theme: "light" },
    );
    expectProportional(circles(el).map((c) => c.r ** 2), [100, 400]);
  });

  it("impactEffortMatrixChart: bubble AREA is proportional to size", () => {
    const el = mount();
    atlas.impactEffortMatrixChart(
      el,
      [
        { label: "a", impact: 3, effort: 3, size: 100 },
        { label: "b", impact: 6, effort: 6, size: 400 },
      ],
      { theme: "light" },
    );
    expectProportional(circles(el).map((c) => c.r ** 2), [100, 400]);
  });

  it("quadrant bubbles stay proportional across a wide size range and for sizes below 1", () => {
    const el = mount();
    atlas.impactEffortMatrixChart(
      el,
      [
        { label: "a", impact: 2, effort: 2, size: 0.04 },
        { label: "b", impact: 4, effort: 5, size: 0.16 },
        { label: "c", impact: 7, effort: 3, size: 0.36 },
        { label: "d", impact: 8, effort: 8, size: 1 },
      ],
      { theme: "light" },
    );
    expectProportional(circles(el).map((c) => c.r ** 2), [0.04, 0.16, 0.36, 1]);
  });

});

describe("lie factor: known violations (each is a defect to fix)", () => {
  it.fails("treemapChart: a 1% tile keeps its share of the area (the 2px gap shrinks small tiles disproportionately)", () => {
    const el = mount();
    atlas.treemapChart(el, { name: "r", children: [{ name: "a", value: 900 }, { name: "b", value: 90 }, { name: "c", value: 10 }] }, { theme: "light" });
    expectProportional(rects(el).map((r) => r.w * r.h), [900, 90, 10]);
  });

  it.fails("waterfallChart: a tiny step is not drawn larger than it is (1-unit minimum bar height)", () => {
    const el = mount();
    atlas.waterfallChart(
      el,
      [
        { label: "Start", value: 1000, isTotal: true },
        { label: "a", value: 1 },
        { label: "b", value: -0.2 },
        { label: "End", value: 1000.8, isTotal: true },
      ],
      { theme: "light" },
    );
    const r = rects(el);
    expectProportional([r[1].h, r[2].h], [1, 0.2]);
  });

  it.fails("costCurveChart: bars narrower than the gap keep distinct widths (volume 1 and 2 both collapse to 0.5)", () => {
    const el = mount();
    atlas.costCurveChart(
      el,
      [
        { label: "a", cost: 10, volume: 1000 },
        { label: "b", cost: 0.1, volume: 1 },
        { label: "c", cost: 40, volume: 2 },
      ],
      { theme: "light" },
    );
    const r = rects(el);
    expectProportional(r.map((m) => m.w), [1, 1000, 2]);
  });

  it.fails("footballFieldChart: a very narrow range is not widened (1-unit minimum bar width)", () => {
    const el = mount();
    atlas.footballFieldChart(
      el,
      [
        { label: "x", low: 0, high: 100 },
        { label: "y", low: 50, high: 50.2 },
      ],
      { theme: "light" },
    );
    expectProportional(rects(el).map((r) => r.w), [100, 0.2]);
  });
});
