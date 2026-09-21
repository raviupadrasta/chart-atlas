import { scaleLinear } from "d3-scale";
import { createChartRoot } from "../core/chart-root.js";
import { tickFormat } from "../core/axes.js";
import { estimateTextWidth, svgEl, clear } from "../core/svg-utils.js";
import { bindTooltip } from "../core/tooltip.js";
import type { BaseChartOptions, ChartInstance } from "../core/types.js";

export interface BarRow {
  label: string;
  value: number;
}

export type BarData = BarRow[];

export interface BarOptions extends BaseChartOptions {
  height?: number;
  /** Format the value written at the end of each bar (default: compact number). */
  format?: (v: number) => string;
}

const WIDTH = 300;

/**
 * Horizontal bars from a zero baseline, one per category, in the order given.
 * Length from a shared zero is the most accurate way to compare amounts, and
 * horizontal bars leave room for real category names. Every value is written
 * at the bar's end, so no gridlines or value axis are needed.
 */
export function barChart(container: HTMLElement, data: BarData, options: BarOptions = {}): ChartInstance<BarData, BarOptions> {
  const root = createChartRoot(container, options.theme);
  let currentData = data;
  let currentOptions = options;
  const cleanups: Array<() => void> = [];

  function render() {
    cleanups.splice(0).forEach((fn) => fn());
    const theme = root.getTheme();
    const fmt = currentOptions.format ?? tickFormat;
    const rows = currentData;
    const height = currentOptions.height ?? Math.max(90, 24 + rows.length * 20);
    root.setViewBox(WIDTH, height);
    clear(root.svg);
    root.svg.appendChild(svgEl("rect", { x: 0, y: 0, width: WIDTH, height, fill: theme.surface }));

    const T = 8;
    const B = 8;
    const R = 40;
    const L = Math.min(110, Math.max(40, ...rows.map((r) => estimateTextWidth(r.label, 10))) + 12);
    const lo = Math.min(0, ...rows.map((r) => r.value));
    const hi = Math.max(0, ...rows.map((r) => r.value));
    // Bars that extend left of zero carry their value label on the left, so keep that space clear of the category names.
    const x = scaleLinear().domain([lo, hi === lo ? lo + 1 : hi]).range([lo < 0 ? L + 34 : L, WIDTH - R]);
    const rowH = (height - T - B) / Math.max(1, rows.length);
    const barH = Math.min(16, rowH * 0.66);

    rows.forEach((r, i) => {
      const cy = T + i * rowH + rowH / 2;
      const x0 = x(0);
      const x1 = x(r.value);
      root.svg.appendChild(svgEl("text", { x: L - 8, y: cy + 3.5, "text-anchor": "end", "font-size": 10, "font-family": "system-ui, sans-serif", fill: theme.ink.secondary })).textContent = r.label;
      const bar = svgEl("rect", { x: Math.min(x0, x1), y: cy - barH / 2, width: Math.max(1, Math.abs(x1 - x0)), height: barH, fill: theme.categorical[0] });
      root.svg.appendChild(bar);
      cleanups.push(bindTooltip(bar, `${r.label}: ${r.value.toLocaleString()}`, theme));
      const neg = r.value < 0;
      root.svg.appendChild(svgEl("text", { x: neg ? x1 - 4 : x1 + 4, y: cy + 3, "text-anchor": neg ? "end" : "start", "font-size": 8.5, "font-family": "ui-monospace, monospace", fill: theme.ink.muted })).textContent = fmt(r.value);
    });
    root.svg.appendChild(svgEl("line", { x1: x(0), x2: x(0), y1: T, y2: height - B, stroke: theme.ink.muted, "stroke-width": 1 }));
  }

  const unwatch = root.onInvalidate(render);
  render();
  return {
    el: container,
    update(nextData, nextOptions) {
      currentData = nextData;
      currentOptions = { ...currentOptions, ...nextOptions };
      if (nextOptions?.theme) root.setThemeMode(nextOptions.theme);
      render();
    },
    resize: render,
    destroy() {
      cleanups.splice(0).forEach((fn) => fn());
      unwatch();
      root.destroy();
    },
  };
}
