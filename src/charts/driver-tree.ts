import { hierarchy, tree as d3tree, type HierarchyPointNode } from "d3-hierarchy";
import { createChartRoot } from "../core/chart-root.js";
import { svgEl, clear, estimateTextWidth } from "../core/svg-utils.js";
import { bindTooltip } from "../core/tooltip.js";
import type { BaseChartOptions, ChartInstance } from "../core/types.js";

export interface DriverNode {
  label: string;
  value?: number;
  /** How this node's children combine to produce its own value (e.g. '×' for Revenue = Price × Volume). Ignored on leaves. */
  childrenOperator?: "×" | "+" | "−";
  children?: DriverNode[];
}

export type DriverTreeData = DriverNode;

export interface DriverTreeOptions extends BaseChartOptions {
  height?: number;
}

const WIDTH = 560;
const BOX_HEIGHT = 32;

/**
 * The classic McKinsey "issue tree"/driver tree: a top KPI decomposed into
 * the drivers that multiply or add up to it. A node-link box diagram, not an
 * area or bar encoding — structurally the odd one out among these charts,
 * which is exactly why it's built last (see ROADMAP sequencing note).
 */
export function driverTreeChart(
  container: HTMLElement,
  data: DriverTreeData,
  options: DriverTreeOptions = {},
): ChartInstance<DriverTreeData, DriverTreeOptions> {
  const root = createChartRoot(container, options.theme);
  let currentData = data;
  let currentOptions = options;
  const cleanups: Array<() => void> = [];

  function boxWidthFor(label: string): number {
    return Math.min(120, Math.max(56, estimateTextWidth(label, 10) + 16));
  }

  function render() {
    cleanups.splice(0).forEach((fn) => fn());
    const theme = root.getTheme();
    const height = currentOptions.height ?? 200;
    root.setViewBox(WIDTH, height);
    clear(root.svg);
    root.svg.appendChild(svgEl("rect", { x: 0, y: 0, width: WIDTH, height, fill: theme.surface }));

    const T = 20;
    const B = 20;
    const L = 12;
    const R = 12;

    const h = hierarchy(currentData);
    // Swapped size ([vertical, horizontal]) is the standard d3 trick for a
    // left-to-right tree: node.x becomes vertical spread, node.y becomes depth.
    const layout = d3tree<DriverNode>().size([height - T - B, WIDTH - L - R])(h);
    const nodes = layout.descendants();
    const pixelX = (n: HierarchyPointNode<DriverNode>) => L + n.y;
    const pixelY = (n: HierarchyPointNode<DriverNode>) => T + n.x;

    // connectors first, so boxes draw on top
    for (const link of layout.links()) {
      const sx = pixelX(link.source) + boxWidthFor(link.source.data.label) / 2;
      const sy = pixelY(link.source);
      const tx = pixelX(link.target) - boxWidthFor(link.target.data.label) / 2;
      const ty = pixelY(link.target);
      const midX = (sx + tx) / 2;
      root.svg.appendChild(
        svgEl("path", {
          d: `M${sx},${sy} L${midX},${sy} L${midX},${ty} L${tx},${ty}`,
          fill: "none",
          stroke: theme.baseline,
          "stroke-width": 1.5,
        }),
      );
    }

    for (const node of nodes) {
      const bw = boxWidthFor(node.data.label);
      const bx = pixelX(node) - bw / 2;
      const by = pixelY(node) - BOX_HEIGHT / 2;
      const isRoot = node.depth === 0;

      const box = svgEl("rect", {
        x: bx,
        y: by,
        width: bw,
        height: BOX_HEIGHT,
        rx: 4,
        fill: isRoot ? theme.categorical[0] : theme.surface,
        "fill-opacity": isRoot ? 0.14 : 1,
        stroke: isRoot ? theme.categorical[0] : theme.border,
        "stroke-width": isRoot ? 1.5 : 1,
      });
      root.svg.appendChild(box);
      const valueStr = node.data.value != null ? node.data.value.toLocaleString() : "";
      cleanups.push(bindTooltip(box, valueStr ? `${node.data.label}: ${valueStr}` : node.data.label, theme));

      root.svg.appendChild(
        svgEl("text", {
          x: pixelX(node),
          y: pixelY(node) + (valueStr ? -3 : 4),
          "text-anchor": "middle",
          "font-size": 9.5,
          "font-family": "system-ui, sans-serif",
          "font-weight": 600,
          fill: theme.ink.primary,
        }),
      ).textContent = node.data.label;
      if (valueStr) {
        root.svg.appendChild(
          svgEl("text", {
            x: pixelX(node),
            y: pixelY(node) + 10,
            "text-anchor": "middle",
            "font-size": 8.5,
            "font-family": "ui-monospace, monospace",
            fill: theme.ink.secondary,
          }),
        ).textContent = valueStr;
      }

      if (node.data.childrenOperator && node.children?.length) {
        const badgeX = bx + bw + 10;
        root.svg.appendChild(
          svgEl("circle", { cx: badgeX, cy: pixelY(node), r: 8, fill: theme.surface, stroke: theme.baseline, "stroke-width": 1.5 }),
        );
        root.svg.appendChild(
          svgEl("text", { x: badgeX, y: pixelY(node) + 3, "text-anchor": "middle", "font-size": 10, fill: theme.ink.secondary }),
        ).textContent = node.data.childrenOperator;
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
