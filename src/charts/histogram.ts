import { scaleLinear } from "d3-scale";
import { createChartRoot } from "../core/chart-root.js";
import { axisTitle, drawXAxis, drawYAxis } from "../core/axes.js";
import { histogramBins } from "../core/bins.js";
import { svgEl, clear } from "../core/svg-utils.js";
import { bindTooltip } from "../core/tooltip.js";
import type { BaseChartOptions, ChartInstance } from "../core/types.js";

/** The raw observations; the chart bins them. */
export type HistogramData = number[];

export interface HistogramOptions extends BaseChartOptions {
  height?: number;
  /** Number of equal-width bins. Default: chosen from the data (Freedman-Diaconis, 5 to 40). */
  bins?: number;
  /** What the values are, for the x-axis title. */
  label?: string;
}

const WIDTH = 300;

/**
 * The shape of one measure: how many observations fall in each equal-width
 * interval. Bars touch (the axis is continuous) and start at zero, so bar
 * height is honest. The shape depends on bin width; the bin count is stated
 * on the chart so a reader knows how it was cut.
 */
export function histogramChart(container: HTMLElement, data: HistogramData, options: HistogramOptions = {}): ChartInstance<HistogramData, HistogramOptions> {
  const root = createChartRoot(container, options.theme);
  let currentData = data;
  let currentOptions = options;
  const cleanups: Array<() => void> = [];

  function render() {
    cleanups.splice(0).forEach((fn) => fn());
    const theme = root.getTheme();
    const height = currentOptions.height ?? 180;
    root.setViewBox(WIDTH, height);
    clear(root.svg);
    root.svg.appendChild(svgEl("rect", { x: 0, y: 0, width: WIDTH, height, fill: theme.surface }));

    const bins = histogramBins(currentData, currentOptions.bins);
    const T = 14;
    const B = currentOptions.label ? 32 : 22;
    const L = 34;
    const R = 14;
    const box = { left: L, right: WIDTH - R, top: T, bottom: height - B };
    if (bins.length === 0) return;
    const x = scaleLinear().domain([bins[0].x0, bins[bins.length - 1].x1]).range([L, WIDTH - R]);
    const y = scaleLinear().domain([0, Math.max(...bins.map((b) => b.count))]).nice().range([height - B, T]);
    drawYAxis(root.svg, theme, y, box, (v) => String(Math.round(v)));
    for (const b of bins) {
      const w = Math.max(0.5, x(b.x1) - x(b.x0) - 0.75);
      const bar = svgEl("rect", { x: x(b.x0), y: y(b.count), width: w, height: Math.max(0, height - B - y(b.count)), fill: theme.categorical[0] });
      root.svg.appendChild(bar);
      cleanups.push(bindTooltip(bar, `${b.x0.toLocaleString(undefined, { maximumSignificantDigits: 4 })} to ${b.x1.toLocaleString(undefined, { maximumSignificantDigits: 4 })}: ${b.count}`, theme));
    }
    drawXAxis(root.svg, theme, x, box);
    axisTitle(root.svg, theme, "count", L, 9, "start");
    if (currentOptions.label) axisTitle(root.svg, theme, `${currentOptions.label} (${bins.length} bins)`, (L + WIDTH - R) / 2, height - 4);
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
