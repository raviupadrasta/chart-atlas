import type { CatalogEntry } from "../types.js";

export const scatter: CatalogEntry = {
  status: "built",
  factory: "scatterChart",
  dataType: "ScatterData",
  id: "scatter",
  title: "Scatter plot",
  insightTypes: ["relationship"],
  questions: ["Do X and Y move together?", "Are there clusters or outliers?"],
  purposes: ["explore", "explain", "reference"],
  familiarity: "conventional",
  primaryEncoding: "position",
  requires: { structure: [], minRows: 8 },
  zeroBaseline: false,
  whenNotToUse: ["Fewer than about 8 points; a table is clearer.", "Heavy overplotting without transparency or binning."],
  alternatives: ["bcg-matrix", "impact-effort-matrix"],
  principles: ["ch12-associations", "vdqi-relational-graphic"],
};
