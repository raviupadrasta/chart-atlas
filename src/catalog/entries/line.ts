import type { CatalogEntry } from "../types.js";

export const line: CatalogEntry = {
  status: "built",
  factory: "lineChart",
  dataType: "LineData",
  id: "line",
  title: "Line chart",
  insightTypes: ["change-over-time"],
  questions: ["How did it move over time?", "Is it rising or falling?"],
  purposes: ["explore", "explain", "monitor", "persuade", "reference"],
  familiarity: "conventional",
  primaryEncoding: "position",
  requires: { structure: ["timeSeries"], minRows: 3 },
  zeroBaseline: false,
  whenNotToUse: ["Fewer than about 8 points; show them as dots or a table.", "More than about 5 series; highlight one or use small multiples."],
  alternatives: ["seasonal-overlay", "bump"],
  principles: ["ch13-time-series"],
};
