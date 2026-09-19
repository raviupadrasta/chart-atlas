import type { CatalogEntry } from "../types.js";

export const sankey: CatalogEntry = {
  id: "sankey",
  status: "built",
  factory: "sankeyChart",
  dataType: "SankeyData",
  title: "Sankey diagram",
  insightTypes: ["flow"],
  questions: [
    "Where does the quantity go?",
    "How does it split and merge through stages?",
    "Which path carries most of the volume?",
  ],
  purposes: ["explain", "explore"],
  familiarity: "specialist",
  primaryEncoding: "area",
  requires: { structure: ["flow"], minRows: 3, maxRows: 40, nonNegative: true },
  zeroBaseline: true,
  whenNotToUse: [
    "The flow has cycles or feedback; a Sankey needs a directed acyclic graph.",
    "Quantities are not conserved across stages, so ribbon widths mislead.",
    "More than about 40 links; it becomes a tangle, so aggregate first or facet.",
    "The reader needs exact values; add labels or use a table.",
  ],
  alternatives: ["waterfall", "stackedBar", "treemap"],
  principles: ["ch11-nested-proportions", "t3-labelled-links"],
};
