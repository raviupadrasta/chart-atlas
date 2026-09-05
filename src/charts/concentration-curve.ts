import { cumsum } from "d3-array";
import { scaleLinear } from "d3-scale";
import { createChartRoot } from "../core/chart-root.js";
import { svgEl, clear } from "../core/svg-utils.js";
import { bindTooltip } from "../core/tooltip.js";
import type { BaseChartOptions, ChartInstance } from "../core/types.js";

/** Raw per-unit values (e.g. revenue per customer) — order doesn't matter, this chart sorts descending itself. */
export type ConcentrationCurveData = number[];

export interface ConcentrationCurveOptions extends BaseChartOptions {
  height?: number;
  /** Label for what's being concentrated, used in the callout. Default "revenue". */
  metricLabel?: string;
  /** Label for the population being ranked. Default "customers". */
  populationLabel?: string;
}

const WIDTH = 300;

/**
 * "The top 20% of customers drive 80% of revenue" — made literal. Cumulative
 * share of the metric (y) against cumulative share of the ranked population
 * (x), against the straight-line "everyone contributes equally" reference.
 * The gap between the curve and that diagonal *is* the concentration.
 */
export function concentrationCurveChart(
  container: HTMLElement,
  data: ConcentrationCurveData,
  options: ConcentrationCurveOptions = {},
): ChartInstance<ConcentrationCurveData, ConcentrationCurveOptions> {
  const root = createChartRoot(container, options.theme);
  let currentData = data;
  let currentOptions = options;
  const cleanups: Array<() => void> = [];

  function render() {
    cleanups.splice(0).forEach((fn) => fn());
    const theme = root.getTheme();
    const height = currentOptions.height ?? 180;
    const metricLabel = currentOptions.metricLabel ?? "revenue";
    const populationLabel = currentOptions.populationLabel ?? "customers";
    root.setViewBox(WIDTH, height);
    clear(root.svg);
    root.svg.appendChild(svgEl("rect", { x: 0, y: 0, width: WIDTH, height, fill: theme.surface }));

    const T = 16;
    const B = 22;
    const L = 30;
    const R = 12;
    const x = scaleLinear().domain([0, 100]).range([L, WIDTH - R]);
    const y = scaleLinear().domain([0, 100]).range([height - B, T]);

    const sorted = [...currentData].sort((a, b) => b - a);
    const total = sorted.reduce((a, b) => a + b, 0) || 1;
    // cumsum returns a Float64Array — its .map() would force a numeric
    // return type, so convert to a plain array before mapping into tuples.
    const cum = Array.from(cumsum(sorted));
    const n = sorted.length;
    const points: [number, number][] = [[0, 0], ...cum.map((c, i) => [((i + 1) / n) * 100, (c / total) * 100] as [number, number])];

    // axes
    root.svg.appendChild(svgEl("line", { x1: L, y1: height - B, x2: WIDTH - R, y2: height - B, stroke: theme.grid }));
    root.svg.appendChild(svgEl("line", { x1: L, y1: T, x2: L, y2: height - B, stroke: theme.grid }));

    // equality reference line
    root.svg.appendChild(
      svgEl("line", { x1: x(0), y1: y(0), x2: x(100), y2: y(100), stroke: theme.ink.muted, "stroke-width": 1, "stroke-opacity": 0.6 }),
    );

    // filled gap between curve and equality line — the concentration, made visible
    const areaPath =
      `M${x(points[0][0])},${y(points[0][1])} ` +
      points.map(([px, py]) => `L${x(px)},${y(py)}`).join(" ") +
      ` L${x(100)},${y(100)} L${x(0)},${y(0)} Z`;
    root.svg.appendChild(svgEl("path", { d: areaPath, fill: theme.categorical[0], "fill-opacity": 0.12 }));

    const curvePath = `M${points.map(([px, py]) => `${x(px)},${y(py)}`).join(" L")}`;
    const curve = svgEl("path", { d: curvePath, fill: "none", stroke: theme.categorical[0], "stroke-width": 2 });
    root.svg.appendChild(curve);
    cleanups.push(bindTooltip(curve, `Cumulative ${metricLabel} vs. cumulative ${populationLabel}`, theme));

    // callout at the 20% mark
    const idx20 = Math.max(0, Math.round(0.2 * n) - 1);
    if (sorted.length > 0) {
      const share20 = (cum[idx20] / total) * 100;
      const px = x(((idx20 + 1) / n) * 100);
      const py = y(share20);
      root.svg.appendChild(svgEl("circle", { cx: px, cy: py, r: 4, fill: theme.categorical[0], stroke: theme.surface, "stroke-width": 2 }));
      root.svg.appendChild(
        svgEl("text", { x: px + 8, y: py - 6, "font-size": 9.5, "font-family": "system-ui, sans-serif", fill: theme.ink.primary, "font-weight": 600 }),
      ).textContent = `top 20% → ${share20.toFixed(0)}%`;
    }

    root.svg.appendChild(
      svgEl("text", { x: (L + WIDTH - R) / 2, y: height - 4, "text-anchor": "middle", "font-size": 9, "font-family": "system-ui, sans-serif", fill: theme.ink.muted }),
    ).textContent = `cumulative % of ${populationLabel}`;
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
