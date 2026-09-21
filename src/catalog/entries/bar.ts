import type { CatalogEntry } from "../types.js";

export const bar: CatalogEntry = {
  status: "built",
  factory: "barChart",
  dataType: "BarData",
  id: "bar",
  title: "Bar chart",
  insightTypes: ["ranking", "part-to-whole"],
  questions: ["Which is biggest and smallest?", "How do categories compare?"],
  purposes: ["explore", "explain", "monitor", "persuade", "reference"],
  familiarity: "conventional",
  primaryEncoding: "length",
  requires: { structure: [], minRows: 2, maxRows: 30 },
  zeroBaseline: true,
  whenNotToUse: ["The categories have a natural order in time; use a line.", "More than about 30 categories; show the top few or facet."],
  alternatives: ["dotPlot", "treemap"],
  principles: ["ch6-amounts", "cleveland-mcgill-length"],
};
