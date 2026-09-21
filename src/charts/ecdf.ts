import { scaleLinear } from "d3-scale";
import { createChartRoot } from "../core/chart-root.js";
import { axisTitle, drawXAxis, drawYAxis } from "../core/axes.js";
import { ecdfSteps } from "../core/bins.js";
import { svgEl, clear } from "../core/svg-utils.js";
import { bindTooltip } from "../core/tooltip.js";
import type { BaseChartOptions, ChartInstance } from "../core/types.js";

/** The raw observations. */
export type EcdfData = number[];

export interface EcdfOptions extends BaseChartOptions {
  height?: number;
  /** What the values are, for the x-axis title. */
  label?: string;
}

const WIDTH = 300;

/**
 * The share of observations at or below each value. No binning choices, every
 * observation is used, and quartiles and thresholds read straight off the
 * curve ("what share is under X?"). The 50% line marks the median.
 */
export function ecdfChart(container: HTMLElement, data: EcdfData, options: EcdfOptions = {}): ChartInstance<EcdfData, EcdfOptions> {
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

    const steps = ecdfSteps(currentData);
    const T = 14;
    const B = currentOptions.label ? 32 : 22;
    const L = 34;
    const R = 14;
    const box = { left: L, right: WIDTH - R, top: T, bottom: height - B };
    if (steps.length === 0) return;
    const x = scaleLinear().domain([steps[0][0], steps[steps.length - 1][0]]).nice().range([L, WIDTH - R]);
    const y = scaleLinear().domain([0, 1]).range([height - B, T]);
    drawYAxis(root.svg, theme, y, box, (v) => `${Math.round(v * 100)}%`);
    root.svg.appendChild(svgEl("line", { x1: L, x2: WIDTH - R, y1: y(0.5), y2: y(0.5), stroke: theme.ink.muted, "stroke-width": 0.75, "stroke-dasharray": "3 3" }));
    drawXAxis(root.svg, theme, x, box);

    // Step-after path: flat until the next observation, then up.
    let d = `M${x(steps[0][0])},${y(0)}`;
    let prev = 0;
    for (const [val, share] of steps) {
      d += ` L${x(val)},${y(prev)} L${x(val)},${y(share)}`;
      prev = share;
    }
    const path = svgEl("path", { d, fill: "none", stroke: theme.categorical[0], "stroke-width": 2, "stroke-linejoin": "round" });
    root.svg.appendChild(path);
    cleanups.push(bindTooltip(path, `${steps.length} distinct values`, theme));
    if (currentOptions.label) axisTitle(root.svg, theme, currentOptions.label, (L + WIDTH - R) / 2, height - 4);
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
