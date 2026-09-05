import { scalePoint, scaleLinear } from "d3-scale";
import { createChartRoot } from "../core/chart-root.js";
import { svgEl, clear } from "../core/svg-utils.js";
import { bindTooltip } from "../core/tooltip.js";
import { categoricalColor } from "../theme/tokens.js";
import type { BaseChartOptions, ChartInstance } from "../core/types.js";

export interface BumpSeries {
  id: string;
  label: string;
  colorIndex: number;
}

export interface BumpDataPoint {
  seriesId: string;
  period: string;
  /** 1 = best/first place. */
  rank: number;
}

export interface BumpData {
  series: BumpSeries[];
  points: BumpDataPoint[];
}

export interface BumpOptions extends BaseChartOptions {
  height?: number;
}

const WIDTH = 300;

/**
 * "Who overtook whom" over many periods — rank, not raw value, tracked
 * period-over-period with crossing lines. Distinct from the atlas's slope
 * chart (exactly two points, raw values) — this is many periods, and the
 * y-axis is an ordinal position, not a magnitude.
 */
export function bumpChart(
  container: HTMLElement,
  data: BumpData,
  options: BumpOptions = {},
): ChartInstance<BumpData, BumpOptions> {
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
    const B = 20;
    const L = 16;
    const R = 62;

    const periods = [...new Set(currentData.points.map((p) => p.period))];
    const maxRank = Math.max(1, ...currentData.points.map((p) => p.rank));
    const x = scalePoint<string>().domain(periods).range([L, WIDTH - R]).padding(0.5);
    const y = scaleLinear().domain([1, maxRank]).range([T, height - B]);

    periods.forEach((p) => {
      root.svg.appendChild(
        svgEl("text", { x: x(p)!, y: height - 4, "text-anchor": "middle", "font-size": 8.5, "font-family": "ui-monospace, monospace", fill: theme.ink.muted }),
      ).textContent = p;
    });

    currentData.series.forEach((series) => {
      const seriesPoints = periods
        .map((p) => currentData.points.find((pt) => pt.seriesId === series.id && pt.period === p))
        .filter((pt): pt is BumpDataPoint => pt != null);
      if (seriesPoints.length === 0) return;
      const color = categoricalColor(theme, series.colorIndex);

      const coords = seriesPoints.map((pt) => [x(pt.period)!, y(pt.rank)] as [number, number]);
      const line = svgEl("polyline", {
        points: coords.map((c) => c.join(",")).join(" "),
        fill: "none",
        stroke: color,
        "stroke-width": 2,
      });
      root.svg.appendChild(line);
      cleanups.push(bindTooltip(line, series.label, theme));

      coords.forEach(([cx, cy]) => {
        root.svg.appendChild(
          svgEl("circle", { cx, cy, r: 4, fill: color, stroke: theme.surface, "stroke-width": 2 }),
        );
      });

      const [lastX, lastY] = coords[coords.length - 1];
      const lastPoint = seriesPoints[seriesPoints.length - 1];
      root.svg.appendChild(
        svgEl("text", { x: lastX + 8, y: lastY + 3, "font-size": 9.5, "font-family": "system-ui, sans-serif", fill: color, "font-weight": 600 }),
      ).textContent = `${series.label} (#${lastPoint.rank})`;
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
