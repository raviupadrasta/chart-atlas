import { scaleLinear } from "d3-scale";
import { createChartRoot } from "../core/chart-root.js";
import { svgEl, clear, smoothPath, type Point } from "../core/svg-utils.js";
import { bindTooltip } from "../core/tooltip.js";
import { categoricalColor } from "../theme/tokens.js";
import type { BaseChartOptions, ChartInstance } from "../core/types.js";

export type SeasonalOverlayEmphasis = "current";

export interface SeasonalOverlaySeries {
  label: string;
  /** Values over one shared cycle (e.g. a year), indexed so every series starts from the same baseline. */
  points: number[];
  /** Mark the one series that is the reader's actual subject — "this cycle vs. history." At most one per chart. */
  emphasis?: SeasonalOverlayEmphasis;
}

export type SeasonalOverlayData = SeasonalOverlaySeries[];

export interface SeasonalOverlayOptions extends BaseChartOptions {
  height?: number;
  /** Tick labels spaced evenly across the x-domain (e.g. month abbreviations). */
  xTickLabels?: string[];
  /** Where the reference line is drawn — the value every series starts from. Default 100 (index-to-100 convention). */
  baselineValue?: number;
}

const WIDTH = 560;

/**
 * "Is this cycle normal?" Every historical pass through the same cycle (year,
 * quarter, whatever repeats) plotted on one shared axis, faded into a
 * reference envelope — except the current cycle and the best/worst/median
 * outcomes on record, picked out by color. Best/worst/median are computed
 * from the data, not passed in: only which series is "current" is an
 * annotation the caller has to supply, since that's identity, not a statistic.
 */
export function seasonalOverlayChart(
  container: HTMLElement,
  data: SeasonalOverlayData,
  options: SeasonalOverlayOptions = {},
): ChartInstance<SeasonalOverlayData, SeasonalOverlayOptions> {
  const root = createChartRoot(container, options.theme);
  let currentData = data;
  let currentOptions = options;
  const cleanups: Array<() => void> = [];

  function render() {
    cleanups.splice(0).forEach((fn) => fn());
    const theme = root.getTheme();
    const height = currentOptions.height ?? 210;
    const baselineValue = currentOptions.baselineValue ?? 100;
    root.setViewBox(WIDTH, height);
    clear(root.svg);
    root.svg.appendChild(svgEl("rect", { x: 0, y: 0, width: WIDTH, height, fill: theme.surface }));

    const series = currentData;
    if (series.length === 0) return;

    const T = 34;
    const B = 24;
    const L = 32;
    const R = 34;

    const current = series.find((s) => s.emphasis === "current");
    // Compare every series at the SAME position current has reached so far (a fair
    // "year-to-date" comparison), or at the longest series' last point if nothing
    // is marked current (a plain full-cycle comparison).
    const compareIdx = current ? current.points.length - 1 : Math.max(...series.map((s) => s.points.length)) - 1;
    const valueAt = (s: SeasonalOverlaySeries) => s.points[Math.min(compareIdx, s.points.length - 1)];

    const others = current ? series.filter((s) => s !== current) : series;
    const best = others.reduce((a, b) => (valueAt(b) > valueAt(a) ? b : a));
    const worst = others.reduce((a, b) => (valueAt(b) < valueAt(a) ? b : a));
    const sortedByValue = [...others].sort((a, b) => valueAt(a) - valueAt(b));
    const median = sortedByValue[Math.floor(sortedByValue.length / 2)];
    const rank = current ? 1 + others.filter((s) => valueAt(s) > valueAt(current)).length : undefined;

    const maxLen = Math.max(...series.map((s) => s.points.length));
    const x = scaleLinear().domain([0, maxLen - 1]).range([L, WIDTH - R]);
    const allValues = series.flatMap((s) => s.points);
    const y = scaleLinear()
      .domain([Math.min(...allValues) * 0.98, Math.max(...allValues) * 1.02])
      .range([height - B, T]);

    root.svg.appendChild(
      svgEl("line", { x1: L, y1: y(baselineValue), x2: WIDTH - R, y2: y(baselineValue), stroke: theme.grid }),
    );

    const xTickLabels = currentOptions.xTickLabels;
    if (xTickLabels && xTickLabels.length > 0) {
      xTickLabels.forEach((label, i) => {
        const px = x((i / xTickLabels.length) * (maxLen - 1));
        root.svg.appendChild(
          svgEl("text", {
            x: px,
            y: height - 6,
            "text-anchor": "middle",
            "font-size": 8,
            "font-family": "system-ui, sans-serif",
            fill: theme.ink.muted,
          }),
        ).textContent = label;
      });
    }

    series.forEach((s) => {
      const isCurrent = s === current;
      const isBest = s === best;
      const isWorst = s === worst;
      const isMedian = s === median;
      const emphasized = isCurrent || isBest || isWorst || isMedian;
      const color = isCurrent
        ? theme.ink.primary
        : isBest
          ? theme.status.good
          : isWorst
            ? theme.status.critical
            : isMedian
              ? categoricalColor(theme, 0)
              : theme.baseline;

      const pts: Point[] = s.points.map((v, i) => [x(i), y(v)]);
      const path = svgEl("path", {
        d: smoothPath(pts),
        fill: "none",
        stroke: color,
        "stroke-width": emphasized ? 2 : 1,
      });
      root.svg.appendChild(path);
      const lastValue = s.points[s.points.length - 1];
      cleanups.push(
        bindTooltip(path, `${s.label}: ${lastValue >= baselineValue ? "+" : ""}${(lastValue - baselineValue).toFixed(1)}`, theme),
      );

      if (emphasized) {
        const [lx, ly] = pts[pts.length - 1];
        root.svg.appendChild(
          svgEl("text", {
            x: lx + 4,
            y: ly + 3,
            "font-size": 8.5,
            "font-weight": isCurrent ? 700 : 600,
            "font-family": "system-ui, sans-serif",
            fill: color,
          }),
        ).textContent = s.label;
      }
    });

    const fmtDelta = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}`;
    const annotations: Array<{ text: string; color: string }> = [];
    if (current && rank !== undefined) {
      annotations.push({
        text: `Current: ${fmtDelta(valueAt(current) - baselineValue)} (Rank ${rank}/${others.length + 1})`,
        color: theme.ink.primary,
      });
    }
    annotations.push({ text: `Best: ${fmtDelta(valueAt(best) - baselineValue)} (${best.label})`, color: theme.status.good });
    annotations.push({ text: `Worst: ${fmtDelta(valueAt(worst) - baselineValue)} (${worst.label})`, color: theme.status.critical });

    annotations.forEach((a, i) => {
      root.svg.appendChild(
        svgEl("text", {
          x: L + 4,
          y: T - 22 + i * 10,
          "font-size": 8,
          "font-weight": i === 0 && current ? 700 : 500,
          "font-family": "ui-monospace, monospace",
          fill: a.color,
        }),
      ).textContent = a.text;
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
