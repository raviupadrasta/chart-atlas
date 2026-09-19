import type { CatalogEntry } from "../types.js";

export const waterfall: CatalogEntry = {
  id: "waterfall",
  status: "built",
  factory: "waterfallChart",
  dataType: "WaterfallData",
  title: "Waterfall (bridge)",
  insightTypes: ["bridge"],
  questions: [
    "How did we get from A to B?",
    "What drove the change in the total?",
    "Which contributions added and which subtracted?",
  ],
  purposes: ["explain", "persuade"],
  familiarity: "conventional",
  primaryEncoding: "length",
  requires: { structure: [], minRows: 3, maxRows: 12 },
  zeroBaseline: false,
  whenNotToUse: [
    "The steps are not additive (they do not sum to the change); use a bar or dumbbell instead.",
    "More than about 12 steps; group the small ones into 'Other' first.",
    "You only have a start and an end value; that is a two-point comparison, not a bridge.",
  ],
  knownIssues: ["Steps smaller than about 1% of the axis range are drawn at a 1-unit minimum height, so they look larger than they are."],
  alternatives: ["bar", "dumbbell", "tornado"],
  principles: ["ch6-amounts", "ch17-proportional-ink"],
};
