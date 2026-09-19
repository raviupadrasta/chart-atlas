import type { CatalogEntry } from "../types.js";

export const radial_badge_bar: CatalogEntry = {
  id: "radial-badge-bar",
  status: "built",
  factory: "radialBadgeBarChart",
  dataType: "RadialBadgeBarData",
  title: "Radial badge bar",
  insightTypes: ["magnitude-duration"],
  questions: [
    "How big is each category and how long has it lasted?",
    "Which categories are both large and long-lived?",
  ],
  purposes: ["monitor", "explore"],
  familiarity: "novel",
  primaryEncoding: "length",
  requires: { structure: [], minRows: 3, maxRows: 12, nonNegative: true },
  zeroBaseline: true,
  whenNotToUse: [
    "The ring encodes an angle, a weaker channel; the two measures are better as a plain scatter or paired bars when accuracy matters.",
    "Ring sweep is capped below a full turn, so the top of the scale is slightly compressed; do not use for exact percentages.",
    "Fewer than 3 categories; state the numbers.",
  ],
  alternatives: ["scatter", "bar", "dotPlot"],
  principles: ["ch6-amounts", "integrity-r34-lie-factor"],
};
