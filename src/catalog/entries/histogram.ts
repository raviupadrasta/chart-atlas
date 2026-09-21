import type { CatalogEntry } from "../types.js";

export const histogram: CatalogEntry = {
  status: "built",
  factory: "histogramChart",
  dataType: "HistogramData",
  id: "histogram",
  title: "Histogram",
  insightTypes: ["distribution"],
  questions: ["What is the shape and spread of the values?", "Where do most values fall?"],
  purposes: ["explore", "explain", "reference"],
  familiarity: "conventional",
  primaryEncoding: "length",
  requires: { structure: [], minRows: 30 },
  zeroBaseline: true,
  whenNotToUse: ["Fewer than about 30 values; show every point.", "The shape changes with bin width; use an ECDF."],
  alternatives: ["ecdf", "boxplot"],
  principles: ["ch7-histograms", "t7-binning"],
};
