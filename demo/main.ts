import { bulletChart, treemapChart, sankeyChart, type BulletData, type TreemapData, type SankeyData } from "../src/index.js";

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
    { id: "visitors", label: "Visitors", colorIndex: undefined },
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

const bullet = bulletChart(document.getElementById("bullet")!, bulletData, { theme: mode });
const treemap = treemapChart(document.getElementById("treemap")!, treemapData, { theme: mode, height: 220 });
const sankey = sankeyChart(document.getElementById("sankey")!, sankeyData, { theme: mode, height: 200 });

document.getElementById("theme-toggle")!.addEventListener("click", () => {
  mode = mode === "light" ? "dark" : "light";
  bullet.update(bulletData, { theme: mode });
  treemap.update(treemapData, { theme: mode });
  sankey.update(sankeyData, { theme: mode });
  document.body.style.background = mode === "dark" ? "#0d0d0d" : "#f9f9f7";
  document.body.style.color = mode === "dark" ? "#ffffff" : "#0b0b0b";
});
