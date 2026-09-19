import type { CatalogEntry } from "../types.js";

export const marimekko: CatalogEntry = {
  id: "marimekko",
  status: "built",
  factory: "marimekkoChart",
  dataType: "MarimekkoData",
  title: "Marimekko (mosaic)",
  insightTypes: ["composition", "part-to-whole"],
  questions: [
    "How does composition differ across segments, and how big is each segment?",
    "Share within share",
  ],
  purposes: ["explain", "explore"],
  familiarity: "specialist",
  primaryEncoding: "area",
  requires: { structure: ["partToWhole", "hierarchy"], minRows: 6, maxRows: 40, nonNegative: true },
  zeroBaseline: true,
  whenNotToUse: [
    "Readers must read exact segment values; area is a weak channel, so use a stacked bar.",
    "More than two levels; nest differently or facet.",
    "Many tiny cells; fold the smallest into 'Other'.",
  ],
  alternatives: ["stackedBar", "treemap", "bar"],
  principles: ["ch11-nested-proportions"],
};
