import type { CatalogEntry } from "../types.js";

export const seasonal_overlay: CatalogEntry = {
  id: "seasonal-overlay",
  status: "built",
  factory: "seasonalOverlayChart",
  dataType: "SeasonalOverlayData",
  title: "Seasonal overlay",
  insightTypes: ["change-over-time"],
  questions: [
    "Is this cycle normal compared with history?",
    "Is the current year running above or below its usual range?",
  ],
  purposes: ["monitor", "explain"],
  familiarity: "specialist",
  primaryEncoding: "position",
  requires: { structure: ["timeSeries", "cyclical"], minRows: 12 },
  zeroBaseline: false,
  whenNotToUse: [
    "There is no repeating cycle or fewer than 3 past cycles.",
    "The trend, not the seasonal pattern, is the story; use a line chart.",
    "Cycles are not comparable in length or definition.",
  ],
  alternatives: ["line", "intervalBand", "horizon"],
  principles: ["ch13-time-series", "ch14-trends"],
};
