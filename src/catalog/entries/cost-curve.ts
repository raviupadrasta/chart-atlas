import type { CatalogEntry } from "../types.js";

export const cost_curve: CatalogEntry = {
  id: "cost-curve",
  status: "built",
  factory: "costCurveChart",
  dataType: "CostCurveData",
  title: "Cost curve (MACC-style)",
  insightTypes: ["cost-volume"],
  questions: [
    "Which options are cheapest per unit, and how much can each deliver?",
    "What total volume is available below a given cost?",
  ],
  purposes: ["explain", "persuade"],
  familiarity: "specialist",
  primaryEncoding: "area",
  requires: { structure: [], minRows: 4, maxRows: 30 },
  zeroBaseline: true,
  whenNotToUse: [
    "Options interact or overlap, so volumes are not additive.",
    "There is no per-unit cost; use a bar of totals.",
    "The audience is unfamiliar with the form and there is no time to explain it.",
  ],
  knownIssues: ["Bars narrower than the gap between bars collapse to a minimum width, so very small volumes look alike."],
  alternatives: ["bar", "waterfall", "scatter"],
  principles: ["ch6-amounts", "t3-labelled-links"],
};
