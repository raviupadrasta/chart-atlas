import { scaleLinear } from "d3-scale";
import { createChartRoot } from "../core/chart-root.js";
import { axisTitle, drawXAxis, drawYAxis } from "../core/axes.js";
import { svgEl, clear } from "../core/svg-utils.js";
import { bindTooltip } from "../core/tooltip.js";
import type { BaseChartOptions, ChartInstance } from "../core/types.js";

export interface ScatterPoint {
  x: number;
  y: number;
  label?: string;
}

export type ScatterData = ScatterPoint[];

export interface ScatterOptions extends BaseChartOptions {
  height?: number;
  xLabel?: string;
  yLabel?: string;
}

const WIDTH = 300;

/**
 * Two measures against each other, one dot per observation. Position on both
 * axes is the most accurate encoding, and the axes fit the data (a scatter
 * shows association, not amount, so zero is not required). Dots are
 * semi-transparent so overlapping observations show as darker areas rather
 * than hiding each other.
 */
export function scatterChart(container: HTMLElement, data: ScatterData, options: ScatterOptions = {}): ChartInstance<ScatterData, ScatterOptions> {
  const root = createChartRoot(container, options.theme);
  let currentData = data;
  let currentOptions = options;
  const cleanups: Array<() => void> = [];

  function render() {
    cleanups.splice(0).forEach((fn) => fn());
    const theme = root.getTheme();
    const height = currentOptions.height ?? 200;
    root.setViewBox(WIDTH, height);
    clear(root.svg);
    root.svg.appendChild(svgEl("rect", { x: 0, y: 0, width: WIDTH, height, fill: theme.surface }));

    const T = currentOptions.yLabel ? 22 : 12;
    const B = currentOptions.xLabel ? 32 : 22;
    const L = 38;
    const R = 14;
    const xs = currentData.map((p) => p.x);
    const ys = currentData.map((p) => p.y);
    const span = (v: number[]): [number, number] => {
      let lo = Infinity;
      let hi = -Infinity;
      for (const n of v) {
        if (n < lo) lo = n;
        if (n > hi) hi = n;
      }
      return lo === hi ? [lo - 1, hi + 1] : [lo, hi];
    };
    const x = scaleLinear().domain(span(xs)).nice().range([L, WIDTH - R]);
    const y = scaleLinear().domain(span(ys)).nice().range([height - B, T]);
    const box = { left: L, right: WIDTH - R, top: T, bottom: height - B };
    drawYAxis(root.svg, theme, y, box);
    drawXAxis(root.svg, theme, x, box);
    if (currentOptions.yLabel) axisTitle(root.svg, theme, currentOptions.yLabel, L, 10, "start");
    if (currentOptions.xLabel) axisTitle(root.svg, theme, currentOptions.xLabel, (L + WIDTH - R) / 2, height - 4);

    const r = currentData.length > 400 ? 1.8 : currentData.length > 100 ? 2.4 : 3.2;
    const opacity = currentData.length > 400 ? 0.35 : currentData.length > 100 ? 0.5 : 0.7;
    for (const p of currentData) {
      const dot = svgEl("circle", { cx: x(p.x), cy: y(p.y), r, fill: theme.categorical[0], "fill-opacity": opacity });
      root.svg.appendChild(dot);
      cleanups.push(bindTooltip(dot, `${p.label ? `${p.label}: ` : ""}${p.x.toLocaleString()}, ${p.y.toLocaleString()}`, theme));
    }
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
