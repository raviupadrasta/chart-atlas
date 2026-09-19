import type { CatalogEntry } from "./types.js";

/**
 * Baseline charts that are not built yet. The recommender uses them to say
 * "the better chart here is a line chart, which chart-atlas does not have yet"
 * instead of forcing a worse built chart silently. Move an entry to `entries/`
 * (status "built") when its renderer lands.
 */
const planned = (e: Omit<CatalogEntry, "status" | "factory" | "dataType">): CatalogEntry => ({
  ...e,
  status: "planned",
  factory: "",
  dataType: "",
});

export const PLANNED_CATALOG: CatalogEntry[] = [
  planned({
    id: "bar",
    title: "Bar chart",
    insightTypes: ["ranking", "part-to-whole"],
    questions: ["Which is biggest and smallest?", "How do categories compare?"],
    purposes: ["explore", "explain", "monitor", "persuade", "reference"],
    familiarity: "conventional",
    primaryEncoding: "length",
    requires: { structure: [], minRows: 2, maxRows: 30 },
    zeroBaseline: true,
    whenNotToUse: ["The categories have a natural order in time; use a line.", "More than about 30 categories; show the top few or facet."],
    alternatives: ["dotPlot", "treemap"],
    principles: ["ch6-amounts", "cleveland-mcgill-length"],
  }),
  planned({
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
  }),
  planned({
    id: "scatter",
    title: "Scatter plot",
    insightTypes: ["relationship"],
    questions: ["Do X and Y move together?", "Are there clusters or outliers?"],
    purposes: ["explore", "explain", "reference"],
    familiarity: "conventional",
    primaryEncoding: "position",
    requires: { structure: [], minRows: 8 },
    zeroBaseline: false,
    whenNotToUse: ["Fewer than about 8 points; a table is clearer.", "Heavy overplotting without transparency or binning."],
    alternatives: ["bcg-matrix", "impact-effort-matrix"],
    principles: ["ch12-associations", "vdqi-relational-graphic"],
  }),
  planned({
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
  }),
  planned({
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
  }),
];
