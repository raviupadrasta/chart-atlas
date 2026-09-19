import { scaleLinear, scaleLog } from "d3-scale";
import { svgEl } from "./svg-utils.js";
import { bindTooltip } from "./tooltip.js";
import { categoricalColor } from "../theme/tokens.js";
import type { ThemeTokens } from "../theme/tokens.js";

/**
 * Shared "2x2 bubble matrix" renderer behind bcgMatrixChart and
 * impactEffortMatrixChart — same shape (two axes, a divider in each,
 * bubbles sized by a third variable), different scales and labels.
 */
export interface QuadrantPoint {
  label: string;
  x: number;
  y: number;
  /** Bubble size basis (raw value — sqrt-scaled here for area-correct sizing). Omit for a uniform small dot. */
  size?: number;
  /** Categorical slot. Omit to render in the default accent. Capped at 3 — this is an all-pairs color form. */
  colorIndex?: 0 | 1 | 2;
}

export interface QuadrantConfig {
  width: number;
  height: number;
  xDomain: [number, number];
  yDomain: [number, number];
  /** BCG Matrix's relative-share axis is conventionally log; impact/effort is linear. Default 'linear'. */
  xScaleType?: "linear" | "log";
  /** BCG Matrix puts high relative share on the LEFT — reverses the x pixel mapping without changing the domain. */
  reverseX?: boolean;
  xLabel: string;
  yLabel: string;
  /** Divider position in domain units. Defaults to the domain midpoint (geometric mean for a log axis). */
  xThreshold?: number;
  yThreshold?: number;
  /** Background quadrant labels, in *visual* position order — this helper only knows pixel geometry, not what your axes mean. */
  quadrantLabels: { topLeft: string; topRight: string; bottomLeft: string; bottomRight: string };
}

export function renderQuadrantScatter(
  svg: SVGSVGElement,
  theme: ThemeTokens,
  points: QuadrantPoint[],
  config: QuadrantConfig,
  cleanups: Array<() => void>,
): void {
  const { width, height, xDomain, yDomain, xLabel, yLabel, quadrantLabels } = config;
  const T = 20;
  const B = 30;
  const L = 42;
  const R = 16;

  svg.appendChild(svgEl("rect", { x: 0, y: 0, width, height, fill: theme.surface }));

  const xRange: [number, number] = config.reverseX ? [width - R, L] : [L, width - R];
  const xScale = (config.xScaleType === "log" ? scaleLog() : scaleLinear()).domain(xDomain).range(xRange);
  const yScale = scaleLinear().domain(yDomain).range([height - B, T]);

  const xThreshold =
    config.xThreshold ?? (config.xScaleType === "log" ? Math.sqrt(xDomain[0] * xDomain[1]) : (xDomain[0] + xDomain[1]) / 2);
  const yThreshold = config.yThreshold ?? (yDomain[0] + yDomain[1]) / 2;
  const xt = xScale(xThreshold);
  const yt = yScale(yThreshold);

  svg.appendChild(svgEl("line", { x1: xt, y1: T, x2: xt, y2: height - B, stroke: theme.grid, "stroke-width": 1 }));
  svg.appendChild(svgEl("line", { x1: L, y1: yt, x2: width - R, y2: yt, stroke: theme.grid, "stroke-width": 1 }));

  // quadrant labels, placed at the geometric center of each pixel region
  const quads: Array<[string, number, number]> = [
    [quadrantLabels.topLeft, (L + xt) / 2, (T + yt) / 2],
    [quadrantLabels.topRight, (xt + (width - R)) / 2, (T + yt) / 2],
    [quadrantLabels.bottomLeft, (L + xt) / 2, (yt + (height - B)) / 2],
    [quadrantLabels.bottomRight, (xt + (width - R)) / 2, (yt + (height - B)) / 2],
  ];
  for (const [label, qx, qy] of quads) {
    const text = svgEl("text", {
      x: qx,
      y: qy,
      "text-anchor": "middle",
      "font-size": 10,
      "font-family": "system-ui, sans-serif",
      fill: theme.ink.muted,
      "font-weight": 600,
      "letter-spacing": "0.02em",
    });
    text.textContent = label;
    svg.appendChild(text);
  }

  // Radius is sqrt-scaled from ZERO so bubble area is proportional to size (a 4x size reads as 4x
  // area). An earlier `4 + 14*sqrt(...)` gave every bubble a minimum radius, which flattened the
  // differences between small bubbles (lie factor ~0.67 at a 4x gap). Unsized points count as 1.
  const maxSize = Math.max(...points.map((p) => p.size ?? 1), Number.MIN_VALUE);
  const R_MAX = 18;
  for (const p of points) {
    const r = R_MAX * Math.sqrt(Math.max(0, p.size ?? 1) / maxSize);
    const color = p.colorIndex != null ? categoricalColor(theme, p.colorIndex) : theme.categorical[0];
    const cx = xScale(p.x);
    const cy = yScale(p.y);
    const circle = svgEl("circle", { cx, cy, r, fill: color, "fill-opacity": 0.65, stroke: color, "stroke-width": 1.5 });
    svg.appendChild(circle);
    cleanups.push(bindTooltip(circle, `${p.label}: ${xLabel} ${p.x}, ${yLabel} ${p.y}`, theme));

    const labelText = svgEl("text", {
      x: cx,
      y: cy - r - 4,
      "text-anchor": "middle",
      "font-size": 9,
      "font-family": "system-ui, sans-serif",
      fill: theme.ink.secondary,
    });
    labelText.textContent = p.label;
    svg.appendChild(labelText);
  }

  svg.appendChild(
    svgEl("text", { x: (L + width - R) / 2, y: height - 6, "text-anchor": "middle", "font-size": 9.5, "font-family": "system-ui, sans-serif", fill: theme.ink.secondary }),
  ).textContent = xLabel;
  const yLabelEl = svgEl("text", {
    x: 12,
    y: (T + height - B) / 2,
    "text-anchor": "middle",
    "font-size": 9.5,
    "font-family": "system-ui, sans-serif",
    fill: theme.ink.secondary,
    transform: `rotate(-90, 12, ${(T + height - B) / 2})`,
  });
  yLabelEl.textContent = yLabel;
  svg.appendChild(yLabelEl);
}
