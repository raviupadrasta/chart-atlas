import { sankey as sankeyLayout } from "d3-sankey";
import { createChartRoot } from "../core/chart-root.js";
import { svgEl, clear } from "../core/svg-utils.js";
import { bindTooltip } from "../core/tooltip.js";
import { categoricalColor } from "../theme/tokens.js";
import type { BaseChartOptions, ChartInstance } from "../core/types.js";

export interface SankeyNodeInput {
  id: string;
  label: string;
  /** Categorical slot for this node's outgoing ribbons. Omit for a drop-off/context node (renders muted). */
  colorIndex?: number;
}

export interface SankeyLinkInput {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNodeInput[];
  links: SankeyLinkInput[];
}

export interface SankeyOptions extends BaseChartOptions {
  height?: number;
  nodeWidth?: number;
}

/** Shape d3-sankey's layout mutates our nodes/links into — narrower than the full d3-sankey generic surface, just the fields we read. */
interface LaidOutNode extends SankeyNodeInput {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  value: number;
}
interface LaidOutLink {
  source: LaidOutNode;
  target: LaidOutNode;
  value: number;
  y0: number;
  y1: number;
  width: number;
}

const WIDTH = 560;

/**
 * Quantity flowing through stages — the ribbon width IS the value. d3-sankey
 * computes the node/link layout; we draw our own flat-edged ribbon (not
 * d3-sankey's default stroked-centerline look) to match the rest of the
 * library's mark language.
 */
export function sankeyChart(
  container: HTMLElement,
  data: SankeyData,
  options: SankeyOptions = {},
): ChartInstance<SankeyData, SankeyOptions> {
  const root = createChartRoot(container, options.theme);
  let currentData = data;
  let currentOptions = options;
  const cleanups: Array<() => void> = [];

  function render() {
    cleanups.splice(0).forEach((fn) => fn());
    const theme = root.getTheme();
    const height = currentOptions.height ?? 170;
    root.setViewBox(WIDTH, height);
    clear(root.svg);
    root.svg.appendChild(svgEl("rect", { x: 0, y: 0, width: WIDTH, height, fill: theme.surface }));

    const indexById = new Map(currentData.nodes.map((n, i) => [n.id, i]));
    const nodes = currentData.nodes.map((n) => ({ ...n }));
    const links = currentData.links.map((l) => ({
      source: indexById.get(l.source)!,
      target: indexById.get(l.target)!,
      value: l.value,
    }));

    const layout = sankeyLayout()
      .nodeWidth(currentOptions.nodeWidth ?? 10)
      .nodePadding(14)
      .extent([
        [8, 10],
        [WIDTH - 8, height - 10],
      ]);
    // d3-sankey's generics are awkward to satisfy exactly for a custom node
    // shape; we know precisely what fields the layout adds (LaidOutNode/Link).
    const graph = layout({ nodes, links } as never) as unknown as {
      nodes: LaidOutNode[];
      links: LaidOutLink[];
    };

    for (const link of graph.links) {
      const color = link.source.colorIndex != null ? categoricalColor(theme, link.source.colorIndex) : theme.ink.muted;
      const d = ribbonPath(
        link.source.x1,
        link.y0 - link.width / 2,
        link.y0 + link.width / 2,
        link.target.x0,
        link.y1 - link.width / 2,
        link.y1 + link.width / 2,
      );
      const path = svgEl("path", { d, fill: color, "fill-opacity": 0.35 });
      root.svg.appendChild(path);
      cleanups.push(bindTooltip(path, `${link.source.label} → ${link.target.label}: ${link.value.toLocaleString()}`, theme));
    }

    for (const node of graph.nodes) {
      const color = node.colorIndex != null ? categoricalColor(theme, node.colorIndex) : theme.ink.muted;
      const rect = svgEl("rect", {
        x: node.x0,
        y: node.y0,
        width: node.x1 - node.x0,
        height: node.y1 - node.y0,
        fill: color,
      });
      root.svg.appendChild(rect);
      cleanups.push(bindTooltip(rect, `${node.label}: ${node.value.toLocaleString()}`, theme));

      const isLeftHalf = node.x0 < WIDTH / 2;
      const text = svgEl("text", {
        x: isLeftHalf ? node.x1 + 8 : node.x0 - 8,
        y: (node.y0 + node.y1) / 2 + 3,
        "text-anchor": isLeftHalf ? "start" : "end",
        "font-size": 10,
        "font-family": "system-ui, sans-serif",
        fill: theme.ink.secondary,
      });
      text.textContent = `${node.label} ${node.value.toLocaleString()}`;
      root.svg.appendChild(text);
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

function ribbonPath(
  x0: number,
  y0top: number,
  y0bot: number,
  x1: number,
  y1top: number,
  y1bot: number,
): string {
  const mx = (x0 + x1) / 2;
  return `M${x0},${y0top} C${mx},${y0top} ${mx},${y1top} ${x1},${y1top} L${x1},${y1bot} C${mx},${y1bot} ${mx},${y0bot} ${x0},${y0bot} Z`;
}
