import type { CatalogEntry } from "./types.js";
import { bar } from "./entries/bar.js";
import { ecdf } from "./entries/ecdf.js";
import { histogram } from "./entries/histogram.js";
import { line } from "./entries/line.js";
import { scatter } from "./entries/scatter.js";
import { bcg_matrix } from "./entries/bcg-matrix.js";
import { bullet } from "./entries/bullet.js";
import { bump } from "./entries/bump.js";
import { concentration_curve } from "./entries/concentration-curve.js";
import { cost_curve } from "./entries/cost-curve.js";
import { driver_tree } from "./entries/driver-tree.js";
import { football_field } from "./entries/football-field.js";
import { impact_effort_matrix } from "./entries/impact-effort-matrix.js";
import { marimekko } from "./entries/marimekko.js";
import { radial_badge_bar } from "./entries/radial-badge-bar.js";
import { sankey } from "./entries/sankey.js";
import { seasonal_overlay } from "./entries/seasonal-overlay.js";
import { tornado } from "./entries/tornado.js";
import { treemap } from "./entries/treemap.js";
import { waterfall } from "./entries/waterfall.js";

export type { CatalogEntry, InsightType, Encoding, StructureFlag, Purpose, Familiarity } from "./types.js";
export { PLANNED_CHARTS } from "./types.js";
export { PLANNED_CATALOG } from "./planned.js";

/** Every chart the recommender may choose from. Add new entries here. */
export const CATALOG: CatalogEntry[] = [
  bar, ecdf, histogram, line, scatter, bcg_matrix, bullet, bump, concentration_curve, cost_curve, driver_tree, football_field, impact_effort_matrix, marimekko, radial_badge_bar, sankey, seasonal_overlay, tornado, treemap, waterfall,
];
