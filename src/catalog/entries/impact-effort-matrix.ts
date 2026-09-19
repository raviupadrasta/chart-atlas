import type { CatalogEntry } from "../types.js";

export const impact_effort_matrix: CatalogEntry = {
  id: "impact-effort-matrix",
  status: "built",
  factory: "impactEffortMatrixChart",
  dataType: "ImpactEffortData",
  title: "Impact / effort matrix",
  insightTypes: ["relationship"],
  questions: [
    "Which initiatives are quick wins?",
    "How should we prioritise given impact and effort?",
  ],
  purposes: ["explain", "persuade"],
  familiarity: "conventional",
  primaryEncoding: "position",
  requires: { structure: [], minRows: 4, maxRows: 20 },
  zeroBaseline: false,
  whenNotToUse: [
    "Impact and effort are guesses with no shared scale; the quadrants imply false precision.",
    "You need a ranked list; use a sorted bar.",
    "More than about 20 items; labels collide.",
  ],
  alternatives: ["scatter", "bar", "bcg-matrix"],
  principles: ["ch12-associations"],
};
