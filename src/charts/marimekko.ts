import { hierarchy, treemap as d3treemap, treemapSliceDice } from "d3-hierarchy";
import { createChartRoot } from "../core/chart-root.js";
import { svgEl, clear, estimateTextWidth } from "../core/svg-utils.js";
import { bindTooltip } from "../core/tooltip.js";
import { categoricalColor } from "../theme/tokens.js";
import { foldToOther, type TreemapNode } from "./treemap.js";
import type { BaseChartOptions, ChartInstance } from "../core/types.js";

/** Same shape as TreemapNode: root's children are the columns, each column's children are its stacked segments. */
export type MarimekkoData = TreemapNode;

export interface MarimekkoOptions extends BaseChartOptions {
  height?: number;
  gap?: number;
}

const WIDTH = 560;

/**
 * The "market map" chart: column width = segment's share of the whole market,
 * stacked segment height = sub-segment share within that column — so the
 * chart encodes two levels of part-to-whole in one area, not just one.
 * `treemapSliceDice` is exactly this layout: dice (vertical column split) at
 * the root, slice (horizontal stack) one level down.
 */
export function marimekkoChart(
  container: HTMLElement,
  data: MarimekkoData,
  options: MarimekkoOptions = {},
): ChartInstance<MarimekkoData, MarimekkoOptions> {
  const root = createChartRoot(container, options.theme);
  let currentData = data;
  let currentOptions = options;
  const cleanups: Array<() => void> = [];

  function render() {
    cleanups.splice(0).forEach((fn) => fn());
    const theme = root.getTheme();
    const height = currentOptions.height ?? 200;
    const gap = currentOptions.gap ?? 2;
    root.setViewBox(WIDTH, height);
    clear(root.svg);
    root.svg.appendChild(svgEl("rect", { x: 0, y: 0, width: WIDTH, height, fill: theme.surface }));

    const headerH = 20;
    const foldedData = foldToOther(currentData, theme.categorical.length);
    const h = hierarchy(foldedData)
      .sum((d) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    const layout = d3treemap<TreemapNode>()
      .tile(treemapSliceDice)
      .size([WIDTH, height - headerH])
      .paddingInner(gap)(h);

    const total = layout.value ?? 1;
    const columns = layout.children ?? [];

    columns.forEach((col, i) => {
      const color = categoricalColor(theme, i);
      const colWidth = col.x1 - col.x0;
      const colPct = (((col.value ?? 0) / total) * 100).toFixed(0);

      // Column header: name + share of total width, offset above the stacked segments.
      if (colWidth - 8 > estimateTextWidth(col.data.name, 10)) {
        root.svg.appendChild(
          svgEl("text", {
            x: col.x0 + colWidth / 2,
            y: headerH - 6,
            "text-anchor": "middle",
            "font-size": 10,
            "font-weight": 600,
            "font-family": "system-ui, sans-serif",
            fill: theme.ink.primary,
          }),
        ).textContent = `${col.data.name} · ${colPct}%`;
      }

      const segments = col.children ?? [col];
      segments.forEach((seg) => {
        const segHeight = seg.y1 - seg.y0;
        const segWidth = seg.x1 - seg.x0;
        const isWholeColumn = segments.length === 1;
        const rect = svgEl("rect", {
          x: seg.x0,
          y: seg.y0 + headerH,
          width: Math.max(0, segWidth),
          height: Math.max(0, segHeight),
          fill: color,
          "fill-opacity": isWholeColumn ? 0.85 : 0.5 + 0.4 * ((segments.indexOf(seg) + 1) / segments.length),
        });
        root.svg.appendChild(rect);
        const segPct = (((seg.value ?? 0) / (col.value ?? 1)) * 100).toFixed(0);
        cleanups.push(
          bindTooltip(rect, `${col.data.name} → ${seg.data.name}: ${segPct}% of column, ${(((seg.value ?? 0) / total) * 100).toFixed(1)}% of total`, theme),
        );

        const labelSize = 9.5;
        if (segWidth - 10 > estimateTextWidth(seg.data.name, labelSize) && segHeight > 20) {
          root.svg.appendChild(
            svgEl("text", {
              x: seg.x0 + 6,
              y: seg.y0 + headerH + 14,
              "font-size": labelSize,
              "font-family": "system-ui, sans-serif",
              fill: "#ffffff",
            }),
          ).textContent = seg.data.name;
        }
      });
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
