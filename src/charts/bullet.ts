import { scaleLinear } from "d3-scale";
import { createChartRoot } from "../core/chart-root.js";
import { svgEl, clear } from "../core/svg-utils.js";
import { bindTooltip } from "../core/tooltip.js";
import type { BaseChartOptions, ChartInstance } from "../core/types.js";

export interface BulletRow {
  label: string;
  /** Two ascending edges splitting [0, max] into three qualitative bands (e.g. poor/ok/good). */
  ranges: [number, number];
  /** The measured value. */
  actual: number;
  /** The value being measured against. */
  target: number;
  /** Scale max. Defaults to the row's own greatest of ranges[1]/actual/target. */
  max?: number;
}

export type BulletData = BulletRow[];

export interface BulletOptions extends BaseChartOptions {
  /** Pixel (viewBox-unit) height per row. Default 64. */
  rowHeight?: number;
  /** Categorical slot index for the actual-value bar. Default 0. */
  colorIndex?: number;
}

const ROW_HEIGHT = 64;
const LABEL_COL = 96;
const RIGHT_PAD = 20;
const TOP_PAD = 20;
const WIDTH = 300;

/**
 * A KPI against both a target and a qualitative range in one compact row —
 * the actual value is a thin bar over gray bands, the target a single tick.
 * No library ships this as a first-class series; it's always hand-built.
 */
export function bulletChart(
  container: HTMLElement,
  data: BulletData,
  options: BulletOptions = {},
): ChartInstance<BulletData, BulletOptions> {
  const root = createChartRoot(container, options.theme);
  let currentData = data;
  let currentOptions = options;
  const cleanups: Array<() => void> = [];

  function render() {
    cleanups.splice(0).forEach((fn) => fn());
    const theme = root.getTheme();
    const rowHeight = currentOptions.rowHeight ?? ROW_HEIGHT;
    const colorIndex = currentOptions.colorIndex ?? 0;
    const height = currentData.length * rowHeight + TOP_PAD;
    root.setViewBox(WIDTH, height);
    clear(root.svg);
    root.svg.appendChild(svgEl("rect", { x: 0, y: 0, width: WIDTH, height, fill: theme.surface }));

    currentData.forEach((row, i) => {
      const max = row.max ?? Math.max(row.ranges[1], row.actual, row.target);
      const x = scaleLinear().domain([0, max]).range([LABEL_COL, WIDTH - RIGHT_PAD]);
      const cy = TOP_PAD + i * rowHeight + rowHeight / 2;

      root.svg.appendChild(
        svgEl("text", {
          x: LABEL_COL - 10,
          y: cy + 4,
          "text-anchor": "end",
          "font-size": 11,
          "font-family": "system-ui, sans-serif",
          fill: theme.ink.secondary,
        }),
      ).textContent = row.label;

      const bandEdges = [0, row.ranges[0], row.ranges[1], max];
      for (let b = 0; b < 3; b++) {
        root.svg.appendChild(
          svgEl("rect", {
            x: x(bandEdges[b]),
            y: cy - 13,
            width: Math.max(0, x(bandEdges[b + 1]) - x(bandEdges[b])),
            height: 26,
            fill: theme.grid,
            "fill-opacity": b === 1 ? 0.55 : 1,
          }),
        );
      }

      const actualBar = svgEl("rect", {
        x: x(0),
        y: cy - 4,
        width: Math.max(0, x(row.actual) - x(0)),
        height: 8,
        rx: 2,
        fill: theme.categorical[colorIndex],
      });
      root.svg.appendChild(actualBar);
      cleanups.push(
        bindTooltip(actualBar, `${row.label}: actual ${row.actual} vs target ${row.target}`, theme),
      );

      root.svg.appendChild(
        svgEl("line", {
          x1: x(row.target),
          y1: cy - 16,
          x2: x(row.target),
          y2: cy + 16,
          stroke: theme.ink.primary,
          "stroke-width": 2.5,
        }),
      );
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
