import { scaleLinear } from "d3-scale";
import { createChartRoot } from "../core/chart-root.js";
import { svgEl, clear } from "../core/svg-utils.js";
import { bindTooltip } from "../core/tooltip.js";
import type { BaseChartOptions, ChartInstance } from "../core/types.js";

export interface TornadoRow {
  label: string;
  /** Value if this variable swings to its downside case. */
  low: number;
  /** Value if this variable swings to its upside case. */
  high: number;
  /** The base-case value every row is measured against. */
  base: number;
}

export type TornadoData = TornadoRow[];

export interface TornadoOptions extends BaseChartOptions {
  height?: number;
  /** Sort rows by swing width, widest first (the classic tornado shape). Default true. */
  sortByImpact?: boolean;
}

const WIDTH = 300;

/**
 * Sensitivity analysis: how much the outcome moves if each variable swings to
 * its downside/upside case, sorted so the variable that matters most sits on
 * top — the shape the chart is named for.
 */
export function tornadoChart(
  container: HTMLElement,
  data: TornadoData,
  options: TornadoOptions = {},
): ChartInstance<TornadoData, TornadoOptions> {
  const root = createChartRoot(container, options.theme);
  let currentData = data;
  let currentOptions = options;
  const cleanups: Array<() => void> = [];

  function render() {
    cleanups.splice(0).forEach((fn) => fn());
    const theme = root.getTheme();
    const height = currentOptions.height ?? 180;
    const sortByImpact = currentOptions.sortByImpact ?? true;
    root.setViewBox(WIDTH, height);
    clear(root.svg);
    root.svg.appendChild(svgEl("rect", { x: 0, y: 0, width: WIDTH, height, fill: theme.surface }));

    const rows = sortByImpact
      ? [...currentData].sort((a, b) => Math.abs(b.high - b.low) - Math.abs(a.high - a.low))
      : currentData;

    const T = 12;
    const B = 8;
    const L = 92;
    const R = 16;
    const all = rows.flatMap((r) => [r.low, r.high, r.base]);
    const x = scaleLinear().domain([Math.min(...all), Math.max(...all)]).nice().range([L, WIDTH - R]);
    const rowHeight = (height - T - B) / rows.length;
    const baseX = x(rows[0]?.base ?? 0);

    rows.forEach((r, i) => {
      const cy = T + i * rowHeight + rowHeight / 2;
      const barH = Math.min(20, rowHeight * 0.6);

      root.svg.appendChild(
        svgEl("text", {
          x: L - 10,
          y: cy + 4,
          "text-anchor": "end",
          "font-size": 10,
          "font-family": "system-ui, sans-serif",
          fill: theme.ink.secondary,
        }),
      ).textContent = r.label;

      const downX = x(r.low);
      const upX = x(r.high);
      const rowBase = x(r.base);

      const downBar = svgEl("rect", {
        x: Math.min(downX, rowBase),
        y: cy - barH / 2,
        width: Math.abs(rowBase - downX),
        height: barH,
        fill: theme.status.critical,
        "fill-opacity": 0.75,
      });
      const upBar = svgEl("rect", {
        x: Math.min(upX, rowBase),
        y: cy - barH / 2,
        width: Math.abs(upX - rowBase),
        height: barH,
        fill: theme.status.good,
        "fill-opacity": 0.75,
      });
      root.svg.append(downBar, upBar);
      cleanups.push(bindTooltip(downBar, `${r.label} downside: ${r.low.toLocaleString()}`, theme));
      cleanups.push(bindTooltip(upBar, `${r.label} upside: ${r.high.toLocaleString()}`, theme));
    });

    root.svg.appendChild(
      svgEl("line", { x1: baseX, y1: T, x2: baseX, y2: height - B, stroke: theme.ink.primary, "stroke-width": 1.5 }),
    );
    root.svg.appendChild(
      svgEl("text", {
        x: baseX,
        y: T - 2,
        "text-anchor": "middle",
        "font-size": 8.5,
        "font-family": "ui-monospace, monospace",
        fill: theme.ink.muted,
      }),
    ).textContent = "base";
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
