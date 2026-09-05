import { createChartRoot } from "../core/chart-root.js";
import { svgEl, clear, donutSegmentPath } from "../core/svg-utils.js";
import { bindTooltip } from "../core/tooltip.js";
import type { BaseChartOptions, ChartInstance } from "../core/types.js";

export interface RadialBadgeBarRow {
  label: string;
  /** Signed value relative to a reference line (e.g. % below/above a prior peak). Drives the bar. */
  magnitude: number;
  /** Non-negative duration since the reference point (e.g. days since that peak). Drives the ring. */
  duration: number;
}

export type RadialBadgeBarData = RadialBadgeBarRow[];

export interface RadialBadgeBarOptions extends BaseChartOptions {
  height?: number;
  /** Unit suffix appended to the magnitude label, e.g. "%". Default "%". */
  magnitudeUnit?: string;
  /** Caption under the duration number inside each ring, e.g. "days". Default "days". */
  durationLabel?: string;
}

const WIDTH = 560;

/**
 * Two linked numbers per category without a second axis: a bar for how far a
 * value sits from a reference line, and a radial progress badge above it for
 * how long it's been there — drawdown-and-days-since-high is the canonical
 * case, but the same shape fits any magnitude+duration pair (days overdue,
 * cycles since a defect, etc).
 *
 * The bar is colored by severity bucket (good/warning/serious/critical),
 * scaled relative to the largest |magnitude| in THIS dataset — not fixed
 * real-world thresholds, since the chart doesn't know its own unit's scale.
 * The ring's sweep is likewise relative to the largest duration in the set.
 * Both rescale whenever the data does — don't compare ring or bar-color
 * severity across two different charts built from this factory.
 */
export function radialBadgeBarChart(
  container: HTMLElement,
  data: RadialBadgeBarData,
  options: RadialBadgeBarOptions = {},
): ChartInstance<RadialBadgeBarData, RadialBadgeBarOptions> {
  const root = createChartRoot(container, options.theme);
  let currentData = data;
  let currentOptions = options;
  const cleanups: Array<() => void> = [];

  function render() {
    cleanups.splice(0).forEach((fn) => fn());
    const theme = root.getTheme();
    const height = currentOptions.height ?? 190;
    const magnitudeUnit = currentOptions.magnitudeUnit ?? "%";
    const durationLabel = currentOptions.durationLabel ?? "days";
    root.setViewBox(WIDTH, height);
    clear(root.svg);
    root.svg.appendChild(svgEl("rect", { x: 0, y: 0, width: WIDTH, height, fill: theme.surface }));

    const rows = currentData;
    if (rows.length === 0) return;

    const T = 52;
    const zeroY = T + 92;
    const ringR = 20;
    const colW = WIDTH / rows.length;
    const maxMagnitude = Math.max(...rows.map((r) => Math.abs(r.magnitude)));
    const maxDuration = Math.max(...rows.map((r) => r.duration));

    root.svg.appendChild(
      svgEl("line", { x1: 0, y1: zeroY, x2: WIDTH, y2: zeroY, stroke: theme.ink.muted, "stroke-width": 1.25 }),
    );

    rows.forEach((row, i) => {
      const cx = colW * i + colW / 2;

      // Radial badge: duration as an arc sweep, capped below 360deg — at exactly
      // 360 the start and end points of donutSegmentPath coincide and the arc
      // collapses to nothing, so the longest-running category still shows a
      // (near-complete but non-degenerate) ring rather than a blank one.
      const sweep = maxDuration > 0 ? Math.min(row.duration / maxDuration, 0.97) * 360 : 0;
      root.svg.appendChild(
        svgEl("circle", { cx, cy: T, r: ringR, fill: "none", stroke: theme.border, "stroke-width": 4 }),
      );
      if (sweep > 1) {
        const arc = svgEl("path", {
          d: donutSegmentPath(cx, T, ringR + 2, ringR - 2, 0, sweep),
          fill: theme.categorical[0],
        });
        root.svg.appendChild(arc);
        cleanups.push(bindTooltip(arc, `${row.label}: ${row.duration} ${durationLabel}`, theme));
      }
      root.svg.appendChild(
        svgEl("text", {
          x: cx,
          y: T + 3,
          "text-anchor": "middle",
          "font-size": 12,
          "font-weight": 700,
          "font-family": "system-ui, sans-serif",
          fill: theme.ink.primary,
        }),
      ).textContent = String(row.duration);
      root.svg.appendChild(
        svgEl("text", {
          x: cx,
          y: T + 13,
          "text-anchor": "middle",
          "font-size": 6.5,
          "font-family": "system-ui, sans-serif",
          fill: theme.ink.muted,
        }),
      ).textContent = durationLabel;
      root.svg.appendChild(
        svgEl("text", {
          x: cx,
          y: T - ringR - 9,
          "text-anchor": "middle",
          "font-size": 9,
          "font-weight": 600,
          "font-family": "system-ui, sans-serif",
          fill: theme.ink.secondary,
        }),
      ).textContent = row.label;

      const depth = Math.abs(row.magnitude);
      const h = maxMagnitude > 0 ? (depth / maxMagnitude) * 72 : 0;
      const color =
        depth === 0
          ? theme.status.good
          : depth < maxMagnitude * 0.15
            ? theme.status.warning
            : depth < maxMagnitude * 0.6
              ? theme.status.serious
              : theme.status.critical;
      const magnitudeText = `${row.magnitude.toFixed(2)}${magnitudeUnit}`;

      if (h > 0.5) {
        const dir = row.magnitude < 0 ? 1 : -1;
        const barY = dir > 0 ? zeroY : zeroY - h;
        const bar = svgEl("rect", { x: cx - 15, y: barY, width: 30, height: h, fill: color, "fill-opacity": 0.85 });
        root.svg.appendChild(bar);
        cleanups.push(bindTooltip(bar, `${row.label}: ${magnitudeText}`, theme));
        root.svg.appendChild(
          svgEl("text", {
            x: cx,
            y: dir > 0 ? zeroY + h + 13 : zeroY - h - 6,
            "text-anchor": "middle",
            "font-size": 9,
            "font-weight": 600,
            "font-family": "system-ui, sans-serif",
            fill: theme.ink.secondary,
          }),
        ).textContent = magnitudeText;
      } else {
        root.svg.appendChild(
          svgEl("text", {
            x: cx,
            y: zeroY + 16,
            "text-anchor": "middle",
            "font-size": 9,
            "font-weight": 600,
            "font-family": "system-ui, sans-serif",
            fill: theme.status.good,
          }),
        ).textContent = magnitudeText;
      }
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
