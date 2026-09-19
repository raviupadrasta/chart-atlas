import type { CatalogEntry } from "../types.js";

export const bullet: CatalogEntry = {
  id: "bullet",
  status: "built",
  factory: "bulletChart",
  dataType: "BulletData",
  title: "Bullet chart",
  insightTypes: ["variance-vs-target"],
  questions: [
    "Are we on target?",
    "How far is each KPI from its goal?",
    "Which metrics are in the good, ok or poor band?",
  ],
  purposes: ["monitor", "explain"],
  familiarity: "specialist",
  primaryEncoding: "position",
  requires: { structure: ["hasTarget"], minRows: 1, maxRows: 15, nonNegative: true },
  zeroBaseline: true,
  whenNotToUse: [
    "There is no target or agreed qualitative bands to compare against.",
    "You want change over time; a bullet chart is a single snapshot per metric.",
  ],
  alternatives: ["bar", "dotPlot"],
  principles: ["ch6-amounts", "ch23-data-and-context"],
};
