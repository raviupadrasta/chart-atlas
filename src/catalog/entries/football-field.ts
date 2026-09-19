import type { CatalogEntry } from "../types.js";

export const football_field: CatalogEntry = {
  id: "football-field",
  status: "built",
  factory: "footballFieldChart",
  dataType: "FootballFieldData",
  title: "Football field (range comparison)",
  insightTypes: ["range"],
  questions: [
    "How do estimates from different methods compare?",
    "Where do the ranges overlap?",
    "What range of values is plausible?",
  ],
  purposes: ["explain", "persuade"],
  familiarity: "specialist",
  primaryEncoding: "position",
  requires: { structure: ["hasInterval"], minRows: 2, maxRows: 12 },
  zeroBaseline: false,
  whenNotToUse: [
    "The ranges are not comparable on one scale.",
    "The data are a distribution of raw observations; show the points or a boxplot instead.",
    "A single point estimate with no interval; nothing to range.",
  ],
  knownIssues: ["Ranges narrower than about 1% of the axis are drawn at a 1-unit minimum width, so they look wider than they are."],
  alternatives: ["errorBars", "tornado", "dotPlot"],
  principles: ["ch16-uncertainty", "t12-measurement-error"],
};
