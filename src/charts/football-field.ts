import { scaleLinear } from "d3-scale";
import { createChartRoot } from "../core/chart-root.js";
import { svgEl, clear } from "../core/svg-utils.js";
import { bindTooltip } from "../core/tooltip.js";
import type { BaseChartOptions, ChartInstance } from "../core/types.js";

export interface FootballFieldRow {
  label: string;
  low: number;
  high: number;
}

export type FootballFieldData = FootballFieldRow[];

export interface FootballFieldOptions extends BaseChartOptions {
  height?: number;
  /** A reference value drawn as a vertical line across every row (e.g. current trading price). */
  referenceValue?: number;
  referenceLabel?: string;
}

const WIDTH = 300;

/**
 * Comparing a range estimate across several methods at a glance — the
 * valuation-range chart bankers and strategy teams both reach for (DCF,
 * trading comps, precedent transactions, 52-week range, ...).
 */
export function footballFieldChart(
  container: HTMLElement,
  data: FootballFieldData,
  options: FootballFieldOptions = {},
): ChartInstance<FootballFieldData, FootballFieldOptions> {
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

    const T = 12;
    const B = 8;
    const L = 82;
    const R = 16;
    const all = currentData.flatMap((r) => [r.low, r.high, currentOptions.referenceValue ?? r.low]);
    const x = scaleLinear().domain([Math.min(...all), Math.max(...all)]).nice().range([L, WIDTH - R]);
    const rowHeight = (height - T - B) / currentData.length;

    currentData.forEach((r, i) => {
      const cy = T + i * rowHeight + rowHeight / 2;
      const barH = Math.min(18, rowHeight * 0.55);
      const x0 = x(r.low);
      const x1 = x(r.high);

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

      const bar = svgEl("rect", {
        x: x0,
        y: cy - barH / 2,
        width: Math.max(1, x1 - x0),
        height: barH,
        rx: barH / 2,
        fill: theme.categorical[0],
        "fill-opacity": 0.7,
      });
      root.svg.appendChild(bar);
      cleanups.push(bindTooltip(bar, `${r.label}: ${r.low.toLocaleString()} – ${r.high.toLocaleString()}`, theme));

      root.svg.appendChild(
        svgEl("text", { x: x0 - 5, y: cy + 3, "text-anchor": "end", "font-size": 8.5, "font-family": "ui-monospace, monospace", fill: theme.ink.muted }),
      ).textContent = r.low.toLocaleString();
      root.svg.appendChild(
        svgEl("text", { x: x1 + 5, y: cy + 3, "text-anchor": "start", "font-size": 8.5, "font-family": "ui-monospace, monospace", fill: theme.ink.muted }),
      ).textContent = r.high.toLocaleString();
    });

    if (currentOptions.referenceValue != null) {
      const rx = x(currentOptions.referenceValue);
      root.svg.appendChild(
        svgEl("line", { x1: rx, y1: T - 2, x2: rx, y2: height - B, stroke: theme.ink.primary, "stroke-width": 1.5 }),
      );
      root.svg.appendChild(
        svgEl("text", { x: rx, y: T - 4, "text-anchor": "middle", "font-size": 8.5, "font-family": "ui-monospace, monospace", fill: theme.ink.muted }),
      ).textContent = currentOptions.referenceLabel ?? "reference";
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
