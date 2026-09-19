import type { CatalogEntry } from "../types.js";

export const bump: CatalogEntry = {
  id: "bump",
  status: "built",
  factory: "bumpChart",
  dataType: "BumpData",
  title: "Bump chart",
  insightTypes: ["rank-change"],
  questions: [
    "Who overtook whom?",
    "How did the ranking change over time?",
  ],
  purposes: ["explain", "explore"],
  familiarity: "conventional",
  primaryEncoding: "position",
  requires: { structure: ["rankOverTime", "timeSeries"], minRows: 6, maxRows: 60 },
  zeroBaseline: false,
  whenNotToUse: [
    "The values, not the ranks, are the story; use a line chart.",
    "More than about 10 series; lines tangle, so highlight a few or facet.",
    "Fewer than 3 periods; use a slope chart.",
  ],
  alternatives: ["line", "slope", "dumbbell"],
  principles: ["ch13-time-series", "c-purpose-first"],
};
