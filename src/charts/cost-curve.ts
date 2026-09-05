import { cumsum } from "d3-array";
import { scaleLinear } from "d3-scale";
import { createChartRoot } from "../core/chart-root.js";
import { svgEl, clear, estimateTextWidth } from "../core/svg-utils.js";
import { bindTooltip } from "../core/tooltip.js";
import type { BaseChartOptions, ChartInstance } from "../core/types.js";

export interface CostCurveStep {
  label: string;
  /** Cost per unit — negative means net savings/benefit, drawn below the zero baseline. */
  cost: number;
  /** Volume/potential this step contributes — becomes the bar's width. */
  volume: number;
}

export type CostCurveData = CostCurveStep[];

export interface CostCurveOptions extends BaseChartOptions {
  height?: number;
  volumeLabel?: string;
}

const WIDTH = 300;

/**
 * McKinsey's marginal-abatement-cost-curve shape, generalized: bars sorted by
 * cost-per-unit ascending, width = volume, so the cumulative x-axis reads as
 * "how much of the total potential costs how much" — bars below zero are net
 * savings, funding the ones above zero.
 */
export function costCurveChart(
  container: HTMLElement,
  data: CostCurveData,
  options: CostCurveOptions = {},
): ChartInstance<CostCurveData, CostCurveOptions> {
  const root = createChartRoot(container, options.theme);
  let currentData = data;
  let currentOptions = options;
  const cleanups: Array<() => void> = [];

  function render() {
    cleanups.splice(0).forEach((fn) => fn());
    const theme = root.getTheme();
    const height = currentOptions.height ?? 180;
    const volumeLabel = currentOptions.volumeLabel ?? "volume";
    root.setViewBox(WIDTH, height);
    clear(root.svg);
    root.svg.appendChild(svgEl("rect", { x: 0, y: 0, width: WIDTH, height, fill: theme.surface }));

    const T = 12;
    const B = 24;
    const L = 34;
    const R = 12;

    const sorted = [...currentData].sort((a, b) => a.cost - b.cost);
    const totalVolume = sorted.reduce((a, b) => a + b.volume, 0) || 1;
    const cumStart = [0, ...cumsum(sorted.map((s) => s.volume))].slice(0, sorted.length);

    const x = scaleLinear().domain([0, totalVolume]).range([L, WIDTH - R]);
    const costs = sorted.map((s) => s.cost);
    const y = scaleLinear().domain([Math.min(0, ...costs), Math.max(0, ...costs)]).nice().range([height - B, T]);

    root.svg.appendChild(svgEl("line", { x1: L, y1: y(0), x2: WIDTH - R, y2: y(0), stroke: theme.grid }));

    sorted.forEach((s, i) => {
      const x0 = x(cumStart[i]);
      const w = x(cumStart[i] + s.volume) - x0;
      const barTop = Math.max(0, s.cost);
      const barBottom = Math.min(0, s.cost);
      const color = s.cost < 0 ? theme.status.good : theme.status.critical;

      const rect = svgEl("rect", {
        x: x0,
        y: y(barTop),
        width: Math.max(0.5, w - 1),
        height: Math.max(1, y(barBottom) - y(barTop)),
        fill: color,
        "fill-opacity": 0.75,
      });
      root.svg.appendChild(rect);
      cleanups.push(bindTooltip(rect, `${s.label}: ${s.cost >= 0 ? "+" : ""}${s.cost} per unit, ${s.volume.toLocaleString()} ${volumeLabel}`, theme));

      if (w - 6 > estimateTextWidth(s.label, 8)) {
        root.svg.appendChild(
          svgEl("text", {
            x: x0 + w / 2,
            y: s.cost >= 0 ? y(barTop) - 4 : y(barBottom) + 12,
            "text-anchor": "middle",
            "font-size": 8,
            "font-family": "system-ui, sans-serif",
            fill: theme.ink.secondary,
          }),
        ).textContent = s.label;
      }
    });

    root.svg.appendChild(
      svgEl("text", { x: (L + WIDTH - R) / 2, y: height - 4, "text-anchor": "middle", "font-size": 9, "font-family": "system-ui, sans-serif", fill: theme.ink.muted }),
    ).textContent = `cumulative ${volumeLabel}`;
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
