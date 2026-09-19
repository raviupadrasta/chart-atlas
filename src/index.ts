// Theme
export { resolveTheme, watchSystemTheme, categoricalColor, THEMES } from "./theme/tokens.js";
export type { ThemeMode, ThemeTokens } from "./theme/tokens.js";

// Core types every chart shares
export type { ChartInstance, ChartFactory, BaseChartOptions } from "./core/types.js";

// Charts (vertical slice — see ROADMAP.md for the rest)
export { bulletChart } from "./charts/bullet.js";
export type { BulletData, BulletRow, BulletOptions } from "./charts/bullet.js";

export { treemapChart } from "./charts/treemap.js";
export type { TreemapData, TreemapNode, TreemapOptions } from "./charts/treemap.js";

export { sankeyChart } from "./charts/sankey.js";
export type { SankeyData, SankeyNodeInput, SankeyLinkInput, SankeyOptions } from "./charts/sankey.js";

// Consulting-idiom charts
export { waterfallChart } from "./charts/waterfall.js";
export type { WaterfallData, WaterfallStep, WaterfallOptions } from "./charts/waterfall.js";

export { tornadoChart } from "./charts/tornado.js";
export type { TornadoData, TornadoRow, TornadoOptions } from "./charts/tornado.js";

export { footballFieldChart } from "./charts/football-field.js";
export type { FootballFieldData, FootballFieldRow, FootballFieldOptions } from "./charts/football-field.js";

export { concentrationCurveChart } from "./charts/concentration-curve.js";
export type { ConcentrationCurveData, ConcentrationCurveOptions } from "./charts/concentration-curve.js";

export { marimekkoChart } from "./charts/marimekko.js";
export type { MarimekkoData, MarimekkoOptions } from "./charts/marimekko.js";

export { costCurveChart } from "./charts/cost-curve.js";
export type { CostCurveData, CostCurveStep, CostCurveOptions } from "./charts/cost-curve.js";

export { bcgMatrixChart } from "./charts/bcg-matrix.js";
export type { BcgMatrixData, BcgMatrixUnit, BcgMatrixOptions } from "./charts/bcg-matrix.js";

export { impactEffortMatrixChart } from "./charts/impact-effort-matrix.js";
export type { ImpactEffortData, InitiativePoint, ImpactEffortMatrixOptions } from "./charts/impact-effort-matrix.js";

export { bumpChart } from "./charts/bump.js";
export type { BumpData, BumpSeries, BumpDataPoint, BumpOptions } from "./charts/bump.js";

export { driverTreeChart } from "./charts/driver-tree.js";
export type { DriverTreeData, DriverNode, DriverTreeOptions } from "./charts/driver-tree.js";

// Other real-world idioms
export { seasonalOverlayChart } from "./charts/seasonal-overlay.js";
export type {
  SeasonalOverlayData,
  SeasonalOverlaySeries,
  SeasonalOverlayEmphasis,
  SeasonalOverlayOptions,
} from "./charts/seasonal-overlay.js";

export { radialBadgeBarChart } from "./charts/radial-badge-bar.js";
export type { RadialBadgeBarData, RadialBadgeBarRow, RadialBadgeBarOptions } from "./charts/radial-badge-bar.js";

// Data profiler: columns, ranked candidate views, findings and caveats
export { profileDataset, profileColumn } from "./profile/index.js";
export type {
  Row,
  Role,
  QuantSubtype,
  Unit,
  ColumnProfile,
  DatasetProfile,
  ProfileOptions,
  View,
  ViewKind,
  ViewColumns,
  Finding,
  FindingType,
  Caveat,
} from "./profile/index.js";

// Chart catalog: what each chart is for, needs, and when not to use it
export { CATALOG, PLANNED_CHARTS } from "./catalog/index.js";
export type { CatalogEntry, InsightType, Purpose, Familiarity, Encoding, StructureFlag } from "./catalog/index.js";
