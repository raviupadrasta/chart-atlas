import type { CatalogEntry } from "../types.js";

export const ecdf: CatalogEntry = {
  status: "built",
  factory: "ecdfChart",
  dataType: "EcdfData",
  id: "ecdf",
  title: "ECDF (cumulative distribution)",
  insightTypes: ["distribution"],
  questions: ["What share of values are below a threshold?", "How do groups differ across the whole range?"],
  purposes: ["explore", "reference"],
  familiarity: "specialist",
  primaryEncoding: "position",
  requires: { structure: [], minRows: 8 },
  zeroBaseline: false,
  whenNotToUse: ["The audience needs hump shapes at a glance; use a histogram."],
  alternatives: ["histogram", "boxplot"],
  principles: ["ch8-ecdf", "t6-raw-data"],
};
