import type { CatalogEntry } from "../types.js";

export const concentration_curve: CatalogEntry = {
  id: "concentration-curve",
  status: "built",
  factory: "concentrationCurveChart",
  dataType: "ConcentrationCurveData",
  title: "Concentration (Pareto / Lorenz) curve",
  insightTypes: ["concentration"],
  questions: [
    "Do a few units drive most of the total?",
    "How unequal is the distribution?",
    "What share of the total comes from the top 20%?",
  ],
  purposes: ["explain", "explore"],
  familiarity: "specialist",
  primaryEncoding: "position",
  requires: { structure: [], minRows: 8, nonNegative: true },
  zeroBaseline: false,
  whenNotToUse: [
    "Values are roughly equal; the curve is a straight diagonal and says little.",
    "Values can be negative; cumulative shares are not defined.",
    "The audience needs the ranking itself; use a sorted bar.",
  ],
  alternatives: ["bar", "histogram", "ecdf"],
  principles: ["ch8-cumulative", "ch6-amounts"],
};
