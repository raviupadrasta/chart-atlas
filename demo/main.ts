import {
  bulletChart,
  treemapChart,
  sankeyChart,
  waterfallChart,
  tornadoChart,
  footballFieldChart,
  concentrationCurveChart,
  marimekkoChart,
  costCurveChart,
  bcgMatrixChart,
  impactEffortMatrixChart,
  bumpChart,
  driverTreeChart,
  seasonalOverlayChart,
  radialBadgeBarChart,
  type BulletData,
  type TreemapData,
  type SankeyData,
  type WaterfallData,
  type TornadoData,
  type FootballFieldData,
  type ConcentrationCurveData,
  type MarimekkoData,
  type CostCurveData,
  type BcgMatrixData,
  type ImpactEffortData,
  type BumpData,
  type DriverTreeData,
  type SeasonalOverlayData,
  type RadialBadgeBarData,
} from "../src/index.js";

import { mountRecommender } from "./recommender.js";

let mode: "light" | "dark" = "light";

const bulletData: BulletData = [
  { label: "Revenue $M", ranges: [40, 70], actual: 78, target: 85, max: 100 },
  { label: "CSAT score", ranges: [50, 75], actual: 62, target: 70, max: 100 },
];

const treemapData: TreemapData = {
  name: "root",
  children: [
    { name: "Engineering", value: 38 },
    { name: "Sales", value: 24 },
    { name: "Marketing", value: 16 },
    { name: "Support", value: 12 },
    { name: "Ops", value: 10 },
  ],
};

const sankeyData: SankeyData = {
  nodes: [
    { id: "visitors", label: "Visitors" },
    { id: "signedup", label: "Signed up", colorIndex: 0 },
    { id: "bounced", label: "Bounced" },
    { id: "purchased", label: "Purchased", colorIndex: 2 },
    { id: "churned", label: "Churned" },
  ],
  links: [
    { source: "visitors", target: "signedup", value: 6000 },
    { source: "visitors", target: "bounced", value: 4000 },
    { source: "signedup", target: "purchased", value: 3400 },
    { source: "signedup", target: "churned", value: 2600 },
  ],
};

const waterfallData: WaterfallData = [
  { label: "FY23", value: 420, isTotal: true },
  { label: "Price", value: 32 },
  { label: "Volume", value: -18 },
  { label: "Mix", value: 11 },
  { label: "FX", value: -6 },
  { label: "FY24", value: 439, isTotal: true },
];

const tornadoData: TornadoData = [
  { label: "Raw material cost", low: 380, high: 500, base: 439 },
  { label: "FX rate", low: 410, high: 460, base: 439 },
  { label: "Volume growth", low: 400, high: 470, base: 439 },
  { label: "Price realization", low: 425, high: 450, base: 439 },
];

const footballFieldData: FootballFieldData = [
  { label: "DCF", low: 38, high: 52 },
  { label: "Trading comps", low: 42, high: 48 },
  { label: "Precedent transactions", low: 45, high: 58 },
  { label: "52-week range", low: 33, high: 47 },
];

const concentrationCurveData: ConcentrationCurveData = [
  120, 95, 80, 60, 45, 30, 22, 18, 14, 12, 10, 9, 8, 7, 6, 5, 5, 4, 4, 3,
];

const marimekkoData: MarimekkoData = {
  name: "root",
  children: [
    {
      name: "North America",
      children: [
        { name: "Enterprise", value: 28 },
        { name: "SMB", value: 14 },
      ],
    },
    {
      name: "EMEA",
      children: [
        { name: "Enterprise", value: 16 },
        { name: "SMB", value: 12 },
      ],
    },
    { name: "APAC", value: 20 },
  ],
};

const costCurveData: CostCurveData = [
  { label: "LED retrofit", cost: -35, volume: 12 },
  { label: "Insulation", cost: -12, volume: 8 },
  { label: "Process tuning", cost: 5, volume: 15 },
  { label: "Fleet electrification", cost: 40, volume: 20 },
  { label: "Carbon capture", cost: 95, volume: 10 },
];

const bcgMatrixData: BcgMatrixData = [
  { label: "Core Platform", relativeShare: 2.4, marketGrowth: 4, revenue: 220, colorIndex: 0 },
  { label: "Mobile App", relativeShare: 1.8, marketGrowth: 18, revenue: 90, colorIndex: 1 },
  { label: "New Markets", relativeShare: 0.3, marketGrowth: 22, revenue: 40, colorIndex: 2 },
  { label: "Legacy Tools", relativeShare: 0.4, marketGrowth: 1, revenue: 60 },
];

const impactEffortData: ImpactEffortData = [
  { label: "Automate onboarding", impact: 8, effort: 2, colorIndex: 0 },
  { label: "Rebuild platform", impact: 9, effort: 9, colorIndex: 1 },
  { label: "Refresh brand", impact: 3, effort: 3 },
  { label: "New pricing page", impact: 6, effort: 8, colorIndex: 2 },
];

const bumpData: BumpData = {
  series: [
    { id: "acme", label: "Acme Co", colorIndex: 0 },
    { id: "globex", label: "Globex", colorIndex: 1 },
    { id: "initech", label: "Initech", colorIndex: 2 },
  ],
  points: [
    { seriesId: "acme", period: "2021", rank: 2 },
    { seriesId: "acme", period: "2022", rank: 1 },
    { seriesId: "acme", period: "2023", rank: 1 },
    { seriesId: "globex", period: "2021", rank: 1 },
    { seriesId: "globex", period: "2022", rank: 2 },
    { seriesId: "globex", period: "2023", rank: 3 },
    { seriesId: "initech", period: "2021", rank: 3 },
    { seriesId: "initech", period: "2022", rank: 3 },
    { seriesId: "initech", period: "2023", rank: 2 },
  ],
};

const driverTreeData: DriverTreeData = {
  label: "Revenue",
  value: 43900,
  childrenOperator: "×",
  children: [
    { label: "Customers", value: 2195 },
    {
      label: "Revenue / customer",
      value: 20,
      childrenOperator: "+",
      children: [
        { label: "Subscription", value: 15 },
        { label: "Usage add-ons", value: 5 },
      ],
    },
  ],
};

// Small seeded PRNG (demo data only — the library itself never generates data).
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seasonalOverlayData: SeasonalOverlayData = (() => {
  const startYear = 2009;
  const curYear = 2026;
  const fullLength = 48;
  const curLength = Math.round(fullLength * 0.67);
  const series: SeasonalOverlayData = [];
  for (let year = startYear; year <= curYear; year++) {
    const rnd = mulberry32(2000 + (year - startYear) * 97);
    const length = year === curYear ? curLength : fullLength;
    const drift = (rnd() - 0.42) * 0.55;
    let v = 100;
    const points = [v];
    for (let i = 1; i < length; i++) {
      v += (rnd() - 0.5) * 3.4 + drift;
      points.push(v);
    }
    series.push({ label: String(year), points, ...(year === curYear ? { emphasis: "current" as const } : {}) });
  }
  return series;
})();

const radialBadgeBarData: RadialBadgeBarData = [
  { label: "Broad market", magnitude: -2.45, duration: 704 },
  { label: "Large cap", magnitude: -7.71, duration: 241 },
  { label: "Large-mid blend", magnitude: -5.45, duration: 241 },
  { label: "Small cap", magnitude: -0.67, duration: 3 },
  { label: "Mid cap", magnitude: 0, duration: 0 },
];

// Each chart instance keeps its own concretely-typed const rather than living in one
// array — a heterogeneous array of ChartInstance<A,...> | ChartInstance<B,...> | ...
// widens every element to the intersection of all their .update() signatures when
// indexed, which rejects every real call. Named consts keep each update() call
// checked against its own chart's actual data/options type.
const bulletC = bulletChart(document.getElementById("bullet")!, bulletData, { theme: mode });
const treemapC = treemapChart(document.getElementById("treemap")!, treemapData, { theme: mode, height: 220 });
const sankeyC = sankeyChart(document.getElementById("sankey")!, sankeyData, { theme: mode, height: 200 });
const waterfallC = waterfallChart(document.getElementById("waterfall")!, waterfallData, { theme: mode, height: 200 });
const tornadoC = tornadoChart(document.getElementById("tornado")!, tornadoData, { theme: mode, height: 200 });
const footballFieldC = footballFieldChart(document.getElementById("football-field")!, footballFieldData, {
  theme: mode,
  height: 200,
  referenceValue: 45,
  referenceLabel: "Current price",
});
const concentrationCurveC = concentrationCurveChart(
  document.getElementById("concentration-curve")!,
  concentrationCurveData,
  { theme: mode, height: 220 },
);
const marimekkoC = marimekkoChart(document.getElementById("marimekko")!, marimekkoData, { theme: mode, height: 220 });
const costCurveC = costCurveChart(document.getElementById("cost-curve")!, costCurveData, {
  theme: mode,
  height: 220,
  volumeLabel: "kt CO2e",
});
const bcgMatrixC = bcgMatrixChart(document.getElementById("bcg-matrix")!, bcgMatrixData, { theme: mode, height: 240 });
const impactEffortC = impactEffortMatrixChart(document.getElementById("impact-effort")!, impactEffortData, {
  theme: mode,
  height: 220,
});
const bumpC = bumpChart(document.getElementById("bump")!, bumpData, { theme: mode, height: 200 });
const driverTreeC = driverTreeChart(document.getElementById("driver-tree")!, driverTreeData, {
  theme: mode,
  height: 220,
});
const seasonalOverlayC = seasonalOverlayChart(document.getElementById("seasonal-overlay")!, seasonalOverlayData, {
  theme: mode,
  height: 210,
  xTickLabels: ["Jan", "Mar", "May", "Jul", "Sep", "Nov"],
});
const radialBadgeBarC = radialBadgeBarChart(document.getElementById("radial-badge-bar")!, radialBadgeBarData, {
  theme: mode,
  height: 190,
});

const refreshRecommender = mountRecommender(document.getElementById("recommender")!, () => mode);

const updaters = [
  () => refreshRecommender(),
  () => bulletC.update(bulletData, { theme: mode }),
  () => treemapC.update(treemapData, { theme: mode }),
  () => sankeyC.update(sankeyData, { theme: mode }),
  () => waterfallC.update(waterfallData, { theme: mode }),
  () => tornadoC.update(tornadoData, { theme: mode }),
  () => footballFieldC.update(footballFieldData, { theme: mode }),
  () => concentrationCurveC.update(concentrationCurveData, { theme: mode }),
  () => marimekkoC.update(marimekkoData, { theme: mode }),
  () => costCurveC.update(costCurveData, { theme: mode }),
  () => bcgMatrixC.update(bcgMatrixData, { theme: mode }),
  () => impactEffortC.update(impactEffortData, { theme: mode }),
  () => bumpC.update(bumpData, { theme: mode }),
  () => driverTreeC.update(driverTreeData, { theme: mode }),
  () => seasonalOverlayC.update(seasonalOverlayData, { theme: mode }),
  () => radialBadgeBarC.update(radialBadgeBarData, { theme: mode }),
];

document.getElementById("theme-toggle")!.addEventListener("click", () => {
  mode = mode === "light" ? "dark" : "light";
  updaters.forEach((update) => update());
  document.body.style.background = mode === "dark" ? "#0d0d0d" : "#f9f9f7";
  document.body.style.color = mode === "dark" ? "#ffffff" : "#0b0b0b";
});
