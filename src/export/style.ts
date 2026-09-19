import { THEMES } from "../theme/tokens.js";
import type { ChartSpec, Tone } from "./spec.js";

/**
 * The one place that decides how an exported chart looks. Every emitter
 * (Vega-Lite, Observable Plot, ECharts, matplotlib, seaborn, Plotly) reads
 * this and nothing else for fonts, sizes, spacing and colour, so the same
 * recommendation looks the same whichever library draws it.
 *
 * To change the font, edit `font.family` (web/JS targets) and
 * `font.familyPython` (matplotlib, seaborn, Plotly). To change colours, edit
 * `src/theme/tokens.ts`. Exports use the light theme.
 */
const t = THEMES.light;

export const STYLE = {
  font: {
    /** CSS font stack for Vega-Lite, Observable Plot and ECharts. */
    family: "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif",
    /** Concrete names for Python; the first one installed wins. */
    familyPython: ["Helvetica", "Arial", "DejaVu Sans"],
    /** Pixels. */
    size: { title: 15, subtitle: 12, axisTitle: 12, tick: 11, legend: 11 },
    titleWeight: 600,
  },
  color: {
    /** Exports always sit on plain white, whatever the atlas surface token is. */
    surface: "#ffffff",
    ink: t.ink.primary,
    inkSecondary: t.ink.secondary,
    grid: t.grid,
    series: t.categorical.slice(0, 8),
    tone: {
      accent: t.categorical[0],
      positive: t.categorical[0],
      negative: t.categorical[1],
      muted: t.neutral.muted,
      ink: t.ink.primary,
      bandLight: t.neutral.bandLight,
      bandMid: t.neutral.bandMid,
      bandDark: t.neutral.bandDark,
    } satisfies Record<Tone, string>,
  },
  /** Pixels. The outer size includes the margins. */
  space: {
    width: 520,
    /** Distance from the top edge to the first title line, in pixels. */
    titleTop: 8,
    /** Characters per title line before it wraps. */
    titleWidth: 62,
    /** Height of charts with a continuous y axis. */
    plotHeight: 340,
    /** Height per category row in horizontal-bar charts, and the smallest chart. */
    rowHeight: 34,
    bulletRowHeight: 44,
    minHeight: 200,
    marginBottom: 48,
    marginTop: 56,
    marginTopWithNotes: 84,
    marginRight: 28,
    marginRightWithLegend: 100,
    marginLeft: 56,
    marginLeftWithTitle: 76,
    marginLeftCategory: 110,
  },
  mark: {
    lineThin: 1.2,
    lineThick: 3,
    pointSize: 9,
    /** Share of a category row a bar fills. */
    barFull: 0.6,
    barThin: 0.3,
    tickWidth: 3,
    tickLength: 26,
    ruleWidth: 1,
    dash: [5, 4],
    gridWidth: 1,
  },
} as const;

/** Names of the series a chart colours by (drives the legend). */
export function legendSeries(spec: ChartSpec): string[] {
  const names = spec.layers.flatMap((l) => (l.mark === "line" || l.mark === "point" ? l.data.map((d) => d.series) : []));
  return [...new Set(names.filter((n): n is string => n !== undefined))];
}

/** Whether a legend is drawn: only when series are coloured apart (not when history is one muted colour). */
export function hasLegend(spec: ChartSpec): boolean {
  return spec.layers.some((l) => (l.mark === "line" || l.mark === "point") && l.colorBySeries);
}

/** The title broken into lines of at most `titleWidth` characters, so long insight statements wrap the same way everywhere. */
export function titleLines(title: string): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of title.split(/\s+/)) {
    if (line && (line + " " + word).length > STYLE.space.titleWidth) {
      lines.push(line);
      line = word;
    } else line = line ? line + " " + word : word;
  }
  if (line) lines.push(line);
  return lines;
}

/** Plot margins in pixels, the same rule in every target (top grows with each extra title line). */
export function margins(spec: ChartSpec): { left: number; right: number; top: number; bottom: number } {
  const s = STYLE.space;
  const extraTitle = (titleLines(spec.title).length - 1) * Math.round(STYLE.font.size.title * 1.3);
  return {
    left: spec.y.kind === "category" ? s.marginLeftCategory : spec.y.title ? s.marginLeftWithTitle : s.marginLeft,
    right: hasLegend(spec) ? s.marginRightWithLegend : s.marginRight,
    top: (spec.notes.length ? s.marginTopWithNotes : s.marginTop) + extraTitle,
    bottom: s.marginBottom,
  };
}

/** Which axes get gridlines: the continuous ones, never a category axis. */
export function gridAxes(spec: ChartSpec): { x: boolean; y: boolean } {
  return { x: spec.x.kind === "linear", y: spec.y.kind === "linear" };
}

/** Outer height for a chart with `rows` categories. */
export function rowChartHeight(rows: number, rowHeight: number = STYLE.space.rowHeight): number {
  return Math.max(STYLE.space.minHeight, rows * rowHeight + STYLE.space.marginTop + STYLE.space.marginBottom);
}

export const DASH = STYLE.mark.dash.join(" ");
