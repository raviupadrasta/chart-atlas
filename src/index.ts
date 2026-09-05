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
