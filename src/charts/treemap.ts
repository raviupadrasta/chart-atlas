import { hierarchy, treemap as d3treemap, treemapSquarify } from "d3-hierarchy";
import { createChartRoot } from "../core/chart-root.js";
import { svgEl, clear, estimateTextWidth } from "../core/svg-utils.js";
import { bindTooltip } from "../core/tooltip.js";
import { categoricalColor } from "../theme/tokens.js";
import type { BaseChartOptions, ChartInstance } from "../core/types.js";

export interface TreemapNode {
  name: string;
  /** Leaf value. Ignored (and computed from children instead) on a non-leaf node. */
  value?: number;
  children?: TreemapNode[];
}

export type TreemapData = TreemapNode;

export interface TreemapOptions extends BaseChartOptions {
  /** Design-space height. Width is fixed at 300 viewBox units. Default 180. */
  height?: number;
  /** Pixel gap between tiles — the mark-spec "surface gap" separator. Default 2. */
  gap?: number;
}

const WIDTH = 300;

/**
 * Part-to-whole where relative area matters more than precise ranking. Root's
 * direct children each claim one fixed categorical slot (in the order given);
 * their descendants inherit that hue at reduced opacity, so nesting stays
 * visually tied to its parent instead of introducing new colors per level.
 * Past the 8-slot categorical cap, extra top-level children fold into "Other".
 */
export function treemapChart(
  container: HTMLElement,
  data: TreemapData,
  options: TreemapOptions = {},
): ChartInstance<TreemapData, TreemapOptions> {
  const root = createChartRoot(container, options.theme);
  let currentData = data;
  let currentOptions = options;
  const cleanups: Array<() => void> = [];

  function render() {
    cleanups.splice(0).forEach((fn) => fn());
    const theme = root.getTheme();
    const height = currentOptions.height ?? 180;
    const gap = currentOptions.gap ?? 2;
    root.setViewBox(WIDTH, height);
    clear(root.svg);

    root.svg.appendChild(svgEl("rect", { x: 0, y: 0, width: WIDTH, height, fill: theme.surface }));

    const foldedData = foldToOther(currentData, theme.categorical.length);
    const h = hierarchy(foldedData)
      .sum((d) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    const layout = d3treemap<TreemapNode>()
      .tile(treemapSquarify)
      .size([WIDTH, height])
      .paddingInner(gap)(h);

    const total = layout.value ?? 1;
    const topLevelIndex = new Map(layout.children?.map((c, i) => [c, i]) ?? []);

    for (const leaf of layout.leaves()) {
      const w = leaf.x1 - leaf.x0;
      const rectHeight = leaf.y1 - leaf.y0;
      let ancestor = leaf;
      while (ancestor.depth > 1) ancestor = ancestor.parent!;
      const slot = topLevelIndex.get(ancestor) ?? 0;
      const color = categoricalColor(theme, slot);
      const isTopLevel = leaf.depth === 1;

      const rect = svgEl("rect", {
        x: leaf.x0,
        y: leaf.y0,
        width: Math.max(0, w),
        height: Math.max(0, rectHeight),
        fill: color,
        "fill-opacity": isTopLevel ? 0.85 : 0.55,
      });
      root.svg.appendChild(rect);
      const pct = (((leaf.value ?? 0) / total) * 100).toFixed(1);
      cleanups.push(bindTooltip(rect, `${leaf.data.name}: ${pct}%`, theme));

      const labelSize = 11;
      const label = leaf.data.name;
      const fits = w - 12 > estimateTextWidth(label, labelSize) && rectHeight > 26;
      if (fits) {
        const text = svgEl("text", {
          x: leaf.x0 + 7,
          y: leaf.y0 + 16,
          "font-size": labelSize,
          "font-family": "system-ui, sans-serif",
          "font-weight": 600,
          fill: "#ffffff",
        });
        text.textContent = label;
        root.svg.appendChild(text);
        if (rectHeight > 40) {
          const value = svgEl("text", {
            x: leaf.x0 + 7,
            y: leaf.y0 + 30,
            "font-size": 9.5,
            "font-family": "ui-monospace, monospace",
            fill: "#ffffff",
            "fill-opacity": 0.85,
          });
          value.textContent = `${pct}%`;
          root.svg.appendChild(value);
        }
      }
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

/** Fold top-level children past the categorical cap into a single "Other" bucket. */
function foldToOther(data: TreemapData, cap: number): TreemapData {
  if (!data.children || data.children.length <= cap) return data;
  const kept = data.children.slice(0, cap - 1);
  const rest = data.children.slice(cap - 1);
  const otherValue = sumValue({ name: "Other", children: rest });
  return { ...data, children: [...kept, { name: "Other", value: otherValue }] };
}

function sumValue(node: TreemapNode): number {
  if (!node.children) return node.value ?? 0;
  return node.children.reduce((acc, c) => acc + sumValue(c), 0);
}
