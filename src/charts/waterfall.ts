import { scaleBand, scaleLinear } from "d3-scale";
import { createChartRoot } from "../core/chart-root.js";
import { svgEl, clear } from "../core/svg-utils.js";
import { bindTooltip } from "../core/tooltip.js";
import type { BaseChartOptions, ChartInstance } from "../core/types.js";

export interface WaterfallStep {
  label: string;
  /**
   * A total/subtotal step: `value` is the absolute level to jump to (bar
   * drawn from 0), and the running baseline resets to it. Otherwise `value`
   * is a signed delta added to the running baseline (bar drawn from the
   * baseline to baseline + value).
   */
  isTotal?: boolean;
  value: number;
}

export type WaterfallData = WaterfallStep[];

export interface WaterfallOptions extends BaseChartOptions {
  height?: number;
}

const WIDTH = 300;

/**
 * The bridge chart: how a starting total becomes an ending total through a
 * sequence of signed contributions — price, volume, mix, FX. Arguably the
 * single most iconic chart in a strategy consulting deck.
 */
export function waterfallChart(
  container: HTMLElement,
  data: WaterfallData,
  options: WaterfallOptions = {},
): ChartInstance<WaterfallData, WaterfallOptions> {
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

    const T = 14;
    const B = 24;
    const L = 8;
    const R = 8;

    // Compute each step's [start, end] span and running baseline.
    let running = 0;
    const spans = currentData.map((step) => {
      const start = step.isTotal ? 0 : running;
      const end = step.isTotal ? step.value : running + step.value;
      running = end;
      return { ...step, start, end };
    });

    const maxV = Math.max(0, ...spans.map((s) => Math.max(s.start, s.end)));
    const minV = Math.min(0, ...spans.map((s) => Math.min(s.start, s.end)));
    const x = scaleBand<string>()
      .domain(spans.map((_, i) => String(i)))
      .range([L, WIDTH - R])
      .padding(0.28);
    const y = scaleLinear().domain([minV, maxV]).nice().range([height - B, T]);

    root.svg.appendChild(
      svgEl("line", { x1: L, y1: y(0), x2: WIDTH - R, y2: y(0), stroke: theme.grid, "stroke-width": 1 }),
    );

    spans.forEach((s, i) => {
      const isIncrease = !s.isTotal && s.end >= s.start;
      const color = s.isTotal ? theme.baseline : isIncrease ? theme.status.good : theme.status.critical;
      const barTop = Math.min(s.start, s.end);
      const barBottom = Math.max(s.start, s.end);
      const bw = x.bandwidth();
      const bx = x(String(i))!;

      const rect = svgEl("rect", {
        x: bx,
        y: y(barBottom),
        width: bw,
        height: Math.max(1, y(barTop) - y(barBottom)),
        rx: 3,
        fill: color,
      });
      root.svg.appendChild(rect);
      const deltaLabel = s.isTotal ? `${s.label}: ${s.value.toLocaleString()}` : `${s.label}: ${s.value >= 0 ? "+" : ""}${s.value.toLocaleString()}`;
      cleanups.push(bindTooltip(rect, deltaLabel, theme));

      // Connector: a thin tick from this bar's carry-over edge to the next bar's start.
      if (i < spans.length - 1) {
        const nextBx = x(String(i + 1))!;
        root.svg.appendChild(
          svgEl("line", {
            x1: bx + bw,
            y1: y(s.end),
            x2: nextBx,
            y2: y(s.end),
            stroke: theme.baseline,
            "stroke-width": 1.5,
          }),
        );
      }

      root.svg.appendChild(
        svgEl("text", {
          x: bx + bw / 2,
          y: height - B + 14,
          "text-anchor": "middle",
          "font-size": 9,
          "font-family": "system-ui, sans-serif",
          fill: theme.ink.secondary,
        }),
      ).textContent = s.label;
    });
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
