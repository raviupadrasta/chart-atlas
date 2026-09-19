import type { CatalogEntry } from "../types.js";

export const driver_tree: CatalogEntry = {
  id: "driver-tree",
  status: "built",
  factory: "driverTreeChart",
  dataType: "DriverTreeData",
  title: "Driver tree",
  insightTypes: ["hierarchy"],
  questions: [
    "What drives this KPI?",
    "How do the components multiply or add up to the total?",
  ],
  purposes: ["explain", "explore"],
  familiarity: "specialist",
  primaryEncoding: "position",
  requires: { structure: ["hierarchy"], minRows: 3, maxRows: 40 },
  zeroBaseline: false,
  whenNotToUse: [
    "The relationships between nodes are not arithmetic or causal; a plain tree adds nothing.",
    "More than about 40 nodes; collapse branches first.",
    "Links must be read as mechanisms; label the operators or do not use it.",
  ],
  alternatives: ["treemap", "waterfall", "sankey"],
  principles: ["t3-labelled-links", "ch11-nested-proportions"],
};
