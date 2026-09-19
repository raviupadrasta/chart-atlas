import type { CatalogEntry } from "../types.js";

export const bcg_matrix: CatalogEntry = {
  id: "bcg-matrix",
  status: "built",
  factory: "bcgMatrixChart",
  dataType: "BcgMatrixData",
  title: "BCG growth-share matrix",
  insightTypes: ["relationship"],
  questions: [
    "Which units are stars, cash cows, question marks or dogs?",
    "How do market share, growth and size relate?",
  ],
  purposes: ["explain", "persuade"],
  familiarity: "specialist",
  primaryEncoding: "position",
  requires: { structure: [], minRows: 3, maxRows: 12 },
  zeroBaseline: false,
  whenNotToUse: [
    "The 2x2 framework is not meaningful to the audience; use a plain scatter.",
    "More than about 12 units; labels collide.",
    "Bubble size must be read precisely; area is a weak channel.",
  ],
  alternatives: ["scatter", "impact-effort-matrix", "bar"],
  principles: ["ch12-associations", "integrity-r36-area"],
};
