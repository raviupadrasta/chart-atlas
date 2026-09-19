import type { CatalogEntry } from "../types.js";

export const treemap: CatalogEntry = {
  id: "treemap",
  status: "built",
  factory: "treemapChart",
  dataType: "TreemapData",
  title: "Treemap",
  insightTypes: ["part-to-whole", "hierarchy"],
  questions: [
    "What share of the total is each part?",
    "Which parts dominate, and how are they nested?",
    "Where does the bulk of the total sit?",
  ],
  purposes: ["explore", "explain"],
  familiarity: "conventional",
  primaryEncoding: "area",
  requires: { structure: [], minRows: 4, maxRows: 60, nonNegative: true },
  zeroBaseline: true,
  whenNotToUse: [
    "Readers must compare two values precisely; area is a weak channel, so use a sorted bar.",
    "Any value is negative; area cannot show sign.",
    "Fewer than about 4 parts; a table or a bar says it more plainly.",
    "Time or order matters; a treemap has no natural order.",
  ],
  knownIssues: ["Tiles under about 3% of the total are drawn slightly too small because of the 2px gap between tiles."],
  alternatives: ["bar", "stackedBar", "waffle", "marimekko"],
  principles: ["ch10-proportions", "ch11-nested-proportions", "cleveland-mcgill-area"],
};
