import { scaleLinear, scalePoint } from "d3-scale";
import { createChartRoot } from "../core/chart-root.js";
import { axisTitle, drawYAxis } from "../core/axes.js";
import { svgEl, clear } from "../core/svg-utils.js";
import { bindTooltip } from "../core/tooltip.js";
import type { BaseChartOptions, ChartInstance } from "../core/types.js";
import { categoricalColor } from "../theme/tokens.js";

export interface LineSeries {
  label: string;
  /** One value per entry of `x`; null leaves a gap (a missing period is not drawn as zero). */
  values: (number | null)[];
}

export interface LineData {
  /** Period labels in order, oldest first. */
  x: string[];
  series: LineSeries[];
}

export interface LineOptions extends BaseChartOptions {
  height?: number;
  /** Start the value axis at zero. Default false: a line encodes change by position, so it may fit the data. */
  zeroBaseline?: boolean;
  yLabel?: string;
}

const WIDTH = 300;

/**
 * Values over time as connected lines. Position on a fitted axis shows the
 * shape of the change; each line is labelled at its end so no legend is
 * needed. One series gets the accent colour; several get distinct colours.
 */
export function lineChart(container: HTMLElement, data: LineData, options: LineOptions = {}): ChartInstance<LineData, LineOptions> {
  const root = createChartRoot(container, options.theme);
  let currentData = data;
  let currentOptions = options;
  const cleanups: Array<() => void> = [];

  function render() {
    cleanups.splice(0).forEach((fn) => fn());
    const theme = root.getTheme();
    const { x: labels, series } = currentData;
    const height = currentOptions.height ?? 180;
    root.setViewBox(WIDTH, height);
    clear(root.svg);
    root.svg.appendChild(svgEl("rect", { x: 0, y: 0, width: WIDTH, height, fill: theme.surface }));

    const multi = series.length > 1;
    const T = currentOptions.yLabel ? 22 : 12;
    const B = 20;
    const L = 34;
    const R = multi ? 66 : 16;
    const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null);
    let lo = Math.min(...all);
    let hi = Math.max(...all);
    if (currentOptions.zeroBaseline) {
      lo = Math.min(0, lo);
      hi = Math.max(0, hi);
    }
    if (lo === hi) hi = lo + 1;
    const y = scaleLinear().domain([lo, hi]).nice().range([height - B, T]);
    const x = scalePoint<string>().domain(labels.map((_, i) => String(i))).range([L, WIDTH - R]).padding(0.1);
    const xAt = (i: number) => x(String(i))!;
    const box = { left: L, right: WIDTH - R, top: T, bottom: height - B };

    drawYAxis(root.svg, theme, y, box);
    if (currentOptions.yLabel) axisTitle(root.svg, theme, currentOptions.yLabel, L, 10, "start");
    const step = Math.max(1, Math.ceil(labels.length / 6));
    labels.forEach((lab, i) => {
      if (i % step !== 0 && i !== labels.length - 1) return;
      if (i !== labels.length - 1 && labels.length - 1 - i < step / 2) return;
      root.svg.appendChild(svgEl("text", { x: xAt(i), y: height - 6, "text-anchor": "middle", "font-size": 8.5, "font-family": "ui-monospace, monospace", fill: theme.ink.muted })).textContent = lab;
    });

    const endLabels: { y: number; text: string; color: string; x: number }[] = [];
    series.forEach((s, k) => {
      const color = categoricalColor(theme, k);
      // Break the line at missing values.
      const runs: [number, number][][] = [];
      let run: [number, number][] = [];
      s.values.forEach((v, i) => {
        if (v === null) {
          if (run.length) runs.push(run);
          run = [];
        } else run.push([xAt(i), y(v)]);
      });
      if (run.length) runs.push(run);
      for (const r of runs) {
        if (r.length === 1) {
          root.svg.appendChild(svgEl("circle", { cx: r[0][0], cy: r[0][1], r: 2.5, fill: color }));
          continue;
        }
        const line = svgEl("polyline", { points: r.map((p) => p.join(",")).join(" "), fill: "none", stroke: color, "stroke-width": 2, "stroke-linejoin": "round" });
        root.svg.appendChild(line);
        cleanups.push(bindTooltip(line, s.label, theme));
      }
      const lastIdx = s.values.reduce<number>((acc, v, i) => (v === null ? acc : i), -1);
      if (lastIdx >= 0) {
        const cx = xAt(lastIdx);
        const cy = y(s.values[lastIdx] as number);
        root.svg.appendChild(svgEl("circle", { cx, cy, r: 3, fill: color, stroke: theme.surface, "stroke-width": 1.5 }));
        if (multi) endLabels.push({ x: cx + 7, y: cy, text: s.label, color });
      }
    });
    // Direct labels must not overprint when lines end close together: sweep top to bottom, pushing each down to keep a gap.
    const GAP = 10;
    endLabels.sort((a, b) => a.y - b.y);
    endLabels.forEach((l, i) => {
      if (i > 0 && l.y - endLabels[i - 1].y < GAP) l.y = endLabels[i - 1].y + GAP;
    });
    for (const l of endLabels) root.svg.appendChild(svgEl("text", { x: l.x, y: l.y + 3, "font-size": 9.5, "font-family": "system-ui, sans-serif", fill: l.color, "font-weight": 600 })).textContent = l.text;
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
