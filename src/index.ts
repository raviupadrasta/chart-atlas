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

// Baseline charts
export { barChart } from "./charts/bar.js";
export type { BarData, BarRow, BarOptions } from "./charts/bar.js";
export { lineChart } from "./charts/line.js";
export type { LineData, LineSeries, LineOptions } from "./charts/line.js";
export { scatterChart } from "./charts/scatter.js";
export type { ScatterData, ScatterPoint, ScatterOptions } from "./charts/scatter.js";
export { histogramChart } from "./charts/histogram.js";
export type { HistogramData, HistogramOptions } from "./charts/histogram.js";
export { ecdfChart } from "./charts/ecdf.js";
export type { EcdfData, EcdfOptions } from "./charts/ecdf.js";

// Recommender inputs: the data profiler and the chart catalog
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
export { CATALOG, PLANNED_CHARTS } from "./catalog/index.js";
export type { CatalogEntry, InsightType, Purpose, Familiarity, Encoding, StructureFlag } from "./catalog/index.js";

// The recommender: profile + context -> chart, table or number, with reasons
export { recommend, resolveContext, recommendAndRender, mapView } from "./recommend/index.js";
export type { Answer, Candidate, Context, Recommendation, Rejection, ResolvedContext, ScoreParts, RecommendOptions, RenderOptions, Rendered, Mapped } from "./recommend/index.js";

// Export a recommendation to other plotting libraries
export { recommendAndExport, emit, toSpec, toVegaLite, toObservablePlot, toPython, toPlotly, toEcharts, TARGETS } from "./export/index.js";
export type { ExportOptions, Exported, Output, ChartSpec, Target } from "./export/index.js";
