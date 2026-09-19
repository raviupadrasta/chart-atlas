// Ad-hoc "does it survive real dummy data" smoke test — one fictional dataset
// (Northwind Coffee Co. FY25 board review) pushed through every exported chart
// factory: initial render, update() with mutated data, resize(), destroy(),
// in both light and dark themes. Not a behavioural test (the other files cover
// specifics) — this just asserts nothing throws and each chart paints SVG.
// Imports from src (not the built dist/): dist/ is git-ignored, so a fresh clone has
// no bundle, and dist/chart-atlas.js has no sibling .d.ts so it also failed typecheck.
import { describe, expect, it } from "vitest";
import * as atlas from "../src/index.js";

type Case = {
  name: string;
  run: (el: HTMLElement, theme: "light" | "dark") => atlas.ChartInstance<any, any>;
  mutate?: (chart: atlas.ChartInstance<any, any>, theme: "light" | "dark") => void;
};

const bullet: atlas.BulletData = [
  { label: "Revenue $M", ranges: [42, 68], actual: 71, target: 80, max: 100 },
  { label: "Gross margin %", ranges: [30, 45], actual: 38, target: 50, max: 60 },
  { label: "NPS", ranges: [20, 50], actual: 44, target: 55, max: 80 },
];

const treemap = {
  name: "Store base",
  children: [
    { name: "Downtown", value: 34 },
    { name: "Airport", value: 21 },
    { name: "Suburban", value: 27 },
    { name: "Campus", value: 11 },
    { name: "Kiosk", value: 7 },
  ],
};

const sankey = {
  nodes: [
    { id: "beans", label: "Green beans" },
    { id: "roasted", label: "Roasted" },
    { id: "retail", label: "Retail bags" },
    { id: "cafe", label: "Cafe pours" },
    { id: "waste", label: "Shrinkage" },
  ],
  links: [
    { source: "beans", target: "roasted", value: 9200 },
    { source: "beans", target: "waste", value: 400 },
    { source: "roasted", target: "retail", value: 3600 },
    { source: "roasted", target: "cafe", value: 5600 },
  ],
};

const waterfall = [
  { label: "FY24", value: 512, isTotal: true },
  { label: "New stores", value: 63 },
  { label: "Same-store", value: 28 },
  { label: "Price", value: 19 },
  { label: "Closures", value: -21 },
  { label: "FX", value: -8 },
  { label: "FY25", value: 593, isTotal: true },
];

const tornado = [
  { label: "Milk price", low: 560, high: 640, base: 593 },
  { label: "Foot traffic", low: 540, high: 650, base: 593 },
  { label: "Labor rate", low: 575, high: 620, base: 593 },
  { label: "Bean cost", low: 568, high: 618, base: 593 },
];

const footballField = [
  { label: "DCF", low: 41, high: 58 },
  { label: "EV/EBITDA comps", low: 45, high: 53 },
  { label: "Precedent M&A", low: 49, high: 64 },
  { label: "52-week", low: 36, high: 51 },
];

const concentration = [140, 110, 88, 71, 52, 40, 31, 24, 19, 15, 12, 10, 9, 7, 6, 5, 4, 4, 3, 2];

const marimekko = {
  name: "Channel x segment",
  children: [
    { name: "Company-owned", children: [{ name: "Espresso bar", value: 33 }, { name: "Drive-thru", value: 22 }] },
    { name: "Franchise", children: [{ name: "Espresso bar", value: 18 }, { name: "Drive-thru", value: 15 }] },
    { name: "Wholesale", value: 24 },
  ],
};

const costCurve = [
  { label: "Lid downgauge", cost: -28, volume: 9 },
  { label: "Route optimization", cost: -9, volume: 7 },
  { label: "Oat milk default", cost: 4, volume: 13 },
  { label: "Solar canopies", cost: 37, volume: 18 },
  { label: "Compostable cups", cost: 82, volume: 11 },
];

const bcg: atlas.BcgMatrixData = [
  { label: "Espresso bars", relativeShare: 2.1, marketGrowth: 5, revenue: 260, colorIndex: 0 },
  { label: "Drive-thru", relativeShare: 1.6, marketGrowth: 16, revenue: 140, colorIndex: 1 },
  { label: "Ready-to-drink", relativeShare: 0.35, marketGrowth: 24, revenue: 48, colorIndex: 2 },
  { label: "Whole-bean retail", relativeShare: 0.5, marketGrowth: 2, revenue: 70 },
];

const impactEffort: atlas.ImpactEffortData = [
  { label: "Mobile order-ahead", impact: 9, effort: 4, colorIndex: 0 },
  { label: "Loyalty revamp", impact: 7, effort: 6, colorIndex: 1 },
  { label: "New cup design", impact: 2, effort: 2 },
  { label: "POS replacement", impact: 6, effort: 9, colorIndex: 2 },
];

const bump = {
  series: [
    { id: "np", label: "Northwind", colorIndex: 0 },
    { id: "bl", label: "Blue Line", colorIndex: 1 },
    { id: "gr", label: "Grind House", colorIndex: 2 },
  ],
  points: [
    { seriesId: "np", period: "Q1", rank: 3 },
    { seriesId: "np", period: "Q2", rank: 2 },
    { seriesId: "np", period: "Q3", rank: 1 },
    { seriesId: "np", period: "Q4", rank: 1 },
    { seriesId: "bl", period: "Q1", rank: 1 },
    { seriesId: "bl", period: "Q2", rank: 1 },
    { seriesId: "bl", period: "Q3", rank: 2 },
    { seriesId: "bl", period: "Q4", rank: 2 },
    { seriesId: "gr", period: "Q1", rank: 2 },
    { seriesId: "gr", period: "Q2", rank: 3 },
    { seriesId: "gr", period: "Q3", rank: 3 },
    { seriesId: "gr", period: "Q4", rank: 3 },
  ],
};

const driverTree: atlas.DriverTreeData = {
  label: "Revenue",
  value: 593000,
  childrenOperator: "×",
  children: [
    { label: "Transactions", value: 29650 },
    {
      label: "Ticket size",
      value: 20,
      childrenOperator: "+",
      children: [
        { label: "Beverage", value: 13 },
        { label: "Food attach", value: 7 },
      ],
    },
  ],
};

const seasonal = (() => {
  const series: { label: string; points: number[]; emphasis?: "current" }[] = [];
  for (let y = 2019; y <= 2025; y++) {
    const len = y === 2025 ? 32 : 48;
    let v = 100;
    const pts = [v];
    for (let i = 1; i < len; i++) {
      v += Math.sin(i / 4 + y) * 1.6 + ((y - 2019) * 0.12 - 0.3);
      pts.push(v);
    }
    series.push(y === 2025 ? { label: String(y), points: pts, emphasis: "current" } : { label: String(y), points: pts });
  }
  return series;
})();

const radialBadge = [
  { label: "All-store comp", magnitude: -1.8, duration: 512 },
  { label: "Airport", magnitude: -6.4, duration: 180 },
  { label: "Suburban", magnitude: -3.1, duration: 180 },
  { label: "Downtown", magnitude: -0.4, duration: 5 },
  { label: "Campus", magnitude: 0, duration: 0 },
];

const cases: Case[] = [
  { name: "bulletChart", run: (el, t) => atlas.bulletChart(el, bullet, { theme: t }),
    mutate: (c, t) => c.update(bullet.map((r) => ({ ...r, actual: r.actual * 0.9 })), { theme: t }) },
  { name: "treemapChart", run: (el, t) => atlas.treemapChart(el, treemap, { theme: t, height: 220 }),
    mutate: (c, t) => c.update({ ...treemap, children: treemap.children.slice(0, 3) }, { theme: t }) },
  { name: "sankeyChart", run: (el, t) => atlas.sankeyChart(el, sankey, { theme: t, height: 200 }),
    mutate: (c, t) => c.update(sankey, { theme: t }) },
  { name: "waterfallChart", run: (el, t) => atlas.waterfallChart(el, waterfall, { theme: t, height: 200 }),
    mutate: (c, t) => c.update(waterfall.slice(0, 5).concat([{ label: "FY25e", value: 560, isTotal: true }]), { theme: t }) },
  { name: "tornadoChart", run: (el, t) => atlas.tornadoChart(el, tornado, { theme: t, height: 200 }),
    mutate: (c, t) => c.update(tornado.slice().reverse(), { theme: t }) },
  { name: "footballFieldChart", run: (el, t) => atlas.footballFieldChart(el, footballField, { theme: t, height: 200, referenceValue: 47, referenceLabel: "Offer" }),
    mutate: (c, t) => c.update(footballField, { theme: t }) },
  { name: "concentrationCurveChart", run: (el, t) => atlas.concentrationCurveChart(el, concentration, { theme: t, height: 220 }),
    mutate: (c, t) => c.update(concentration.slice(0, 12), { theme: t }) },
  { name: "marimekkoChart", run: (el, t) => atlas.marimekkoChart(el, marimekko, { theme: t, height: 220 }),
    mutate: (c, t) => c.update(marimekko, { theme: t }) },
  { name: "costCurveChart", run: (el, t) => atlas.costCurveChart(el, costCurve, { theme: t, height: 220, volumeLabel: "kt CO2e" }),
    mutate: (c, t) => c.update(costCurve.slice(0, 3), { theme: t }) },
  { name: "bcgMatrixChart", run: (el, t) => atlas.bcgMatrixChart(el, bcg, { theme: t, height: 240 }),
    mutate: (c, t) => c.update(bcg.map((u) => ({ ...u, revenue: u.revenue * 1.2 })), { theme: t }) },
  { name: "impactEffortMatrixChart", run: (el, t) => atlas.impactEffortMatrixChart(el, impactEffort, { theme: t, height: 220 }),
    mutate: (c, t) => c.update(impactEffort, { theme: t }) },
  { name: "bumpChart", run: (el, t) => atlas.bumpChart(el, bump, { theme: t, height: 200 }),
    mutate: (c, t) => c.update(bump, { theme: t }) },
  { name: "driverTreeChart", run: (el, t) => atlas.driverTreeChart(el, driverTree, { theme: t, height: 220 }),
    mutate: (c, t) => c.update(driverTree, { theme: t }) },
  { name: "seasonalOverlayChart", run: (el, t) => atlas.seasonalOverlayChart(el, seasonal, { theme: t, height: 210, xTickLabels: ["Jan", "Apr", "Jul", "Oct"] }),
    mutate: (c, t) => c.update(seasonal, { theme: t }) },
  { name: "radialBadgeBarChart", run: (el, t) => atlas.radialBadgeBarChart(el, radialBadge, { theme: t, height: 190 }),
    mutate: (c, t) => c.update(radialBadge, { theme: t }) },
];

function mount(): HTMLDivElement {
  const div = document.createElement("div");
  Object.defineProperty(div, "clientWidth", { value: 640, configurable: true });
  Object.defineProperty(div, "clientHeight", { value: 320, configurable: true });
  document.body.appendChild(div);
  return div;
}

describe("dummy-data smoke test — every exported chart, both themes", () => {
  it("exports exactly the 15 chart factories under test", () => {
    const factoryNames = Object.keys(atlas).filter((k) => k.endsWith("Chart"));
    expect(new Set(factoryNames)).toEqual(new Set(cases.map((c) => c.name)));
  });

  for (const theme of ["light", "dark"] as const) {
    for (const c of cases) {
      it(`${c.name} — render / update / resize / destroy (${theme})`, () => {
        const el = mount();

        const chart = c.run(el, theme);
        const svg = el.querySelector("svg");
        expect(svg, "renders an <svg>").not.toBeNull();
        expect(svg!.querySelectorAll("*").length, "svg has painted content").toBeGreaterThan(0);

        expect(() => c.mutate?.(chart, theme)).not.toThrow();
        expect(el.querySelector("svg"), "still has an <svg> after update").not.toBeNull();

        expect(() => chart.resize()).not.toThrow();

        chart.destroy();
        expect(el.innerHTML, "destroy() clears the container").toBe("");

        el.remove();
      });
    }
  }
});
