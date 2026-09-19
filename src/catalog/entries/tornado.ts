import type { CatalogEntry } from "../types.js";

export const tornado: CatalogEntry = {
  id: "tornado",
  status: "built",
  factory: "tornadoChart",
  dataType: "TornadoData",
  title: "Tornado (sensitivity)",
  insightTypes: ["range"],
  questions: [
    "Which input swings the outcome most?",
    "How sensitive is the result to each assumption?",
  ],
  purposes: ["explain", "persuade"],
  familiarity: "specialist",
  primaryEncoding: "length",
  requires: { structure: ["hasInterval", "hasBase"], minRows: 3, maxRows: 15 },
  zeroBaseline: false,
  whenNotToUse: [
    "The inputs are not varied independently around one base case.",
    "There is no base case; use a football field for ranges by method.",
    "Fewer than 3 drivers; state them in a sentence or table.",
  ],
  alternatives: ["football-field", "dotPlot", "bar"],
  principles: ["ch16-uncertainty", "ch6-amounts"],
};
