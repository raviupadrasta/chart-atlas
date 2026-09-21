import type { CatalogEntry } from "./types.js";

/**
 * Baseline charts that are not built yet. The recommender uses them to say
 * "the better chart here is a line chart, which chart-atlas does not have yet"
 * instead of forcing a worse built chart silently. Move an entry to `entries/`
 * (status "built") when its renderer lands.
 */
/** Exported so the helper stays available (and type-checked) while the list below is empty; use it when adding the next planned chart. */
export const planned = (e: Omit<CatalogEntry, "status" | "factory" | "dataType">): CatalogEntry => ({
  ...e,
  status: "planned",
  factory: "",
  dataType: "",
});

export const PLANNED_CATALOG: CatalogEntry[] = [];
