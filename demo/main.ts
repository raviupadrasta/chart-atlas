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
} from "../src/index.js";

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

const charts = [
  bulletChart(document.getElementById("bullet")!, bulletData, { theme: mode }),
  treemapChart(document.getElementById("treemap")!, treemapData, { theme: mode, height: 220 }),
  sankeyChart(document.getElementById("sankey")!, sankeyData, { theme: mode, height: 200 }),
  waterfallChart(document.getElementById("waterfall")!, waterfallData, { theme: mode, height: 200 }),
  tornadoChart(document.getElementById("tornado")!, tornadoData, { theme: mode, height: 200 }),
  footballFieldChart(document.getElementById("football-field")!, footballFieldData, {
    theme: mode,
    height: 200,
    referenceValue: 45,
    referenceLabel: "Current price",
  }),
  concentrationCurveChart(document.getElementById("concentration-curve")!, concentrationCurveData, { theme: mode, height: 220 }),
  marimekkoChart(document.getElementById("marimekko")!, marimekkoData, { theme: mode, height: 220 }),
  costCurveChart(document.getElementById("cost-curve")!, costCurveData, { theme: mode, height: 220, volumeLabel: "kt CO2e" }),
  bcgMatrixChart(document.getElementById("bcg-matrix")!, bcgMatrixData, { theme: mode, height: 240 }),
  impactEffortMatrixChart(document.getElementById("impact-effort")!, impactEffortData, { theme: mode, height: 220 }),
  bumpChart(document.getElementById("bump")!, bumpData, { theme: mode, height: 200 }),
  driverTreeChart(document.getElementById("driver-tree")!, driverTreeData, { theme: mode, height: 220 }),
];

const updaters = [
  () => charts[0].update(bulletData, { theme: mode }),
  () => charts[1].update(treemapData, { theme: mode }),
  () => charts[2].update(sankeyData, { theme: mode }),
  () => charts[3].update(waterfallData, { theme: mode }),
  () => charts[4].update(tornadoData, { theme: mode }),
  () => charts[5].update(footballFieldData, { theme: mode }),
  () => charts[6].update(concentrationCurveData, { theme: mode }),
  () => charts[7].update(marimekkoData, { theme: mode }),
  () => charts[8].update(costCurveData, { theme: mode }),
  () => charts[9].update(bcgMatrixData, { theme: mode }),
  () => charts[10].update(impactEffortData, { theme: mode }),
  () => charts[11].update(bumpData, { theme: mode }),
  () => charts[12].update(driverTreeData, { theme: mode }),
];

document.getElementById("theme-toggle")!.addEventListener("click", () => {
  mode = mode === "light" ? "dark" : "light";
  updaters.forEach((update) => update());
  document.body.style.background = mode === "dark" ? "#0d0d0d" : "#f9f9f7";
  document.body.style.color = mode === "dark" ? "#ffffff" : "#0b0b0b";
});
