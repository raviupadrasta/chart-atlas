import type { ScaleLinear } from "d3-scale";
import type { ThemeTokens } from "../theme/tokens.js";
import { svgEl } from "./svg-utils.js";

const MONO = "ui-monospace, monospace";

/** Compact number for an axis tick: 1200 -> "1.2k", 0.25 -> "0.25". */
export function tickFormat(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e9) return `${+(v / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${+(v / 1e6).toFixed(1)}M`;
  if (a >= 1e4) return `${+(v / 1e3).toFixed(1)}k`;
  if (a >= 100) return String(Math.round(v));
  return String(+v.toFixed(2));
}

export interface AxisBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Light horizontal gridlines with value labels down the left edge. */
export function drawYAxis(
  svg: SVGElement,
  theme: ThemeTokens,
  y: ScaleLinear<number, number>,
  box: AxisBox,
  format: (v: number) => string = tickFormat,
): void {
  for (const t of y.ticks(4)) {
    svg.appendChild(svgEl("line", { x1: box.left, x2: box.right, y1: y(t), y2: y(t), stroke: theme.grid, "stroke-width": 0.75 }));
    svg.appendChild(svgEl("text", { x: box.left - 5, y: y(t) + 3, "text-anchor": "end", "font-size": 8.5, "font-family": MONO, fill: theme.ink.muted })).textContent = format(t);
  }
}

/** Value labels along the bottom edge, with short tick marks. */
export function drawXAxis(
  svg: SVGElement,
  theme: ThemeTokens,
  x: ScaleLinear<number, number>,
  box: AxisBox,
  format: (v: number) => string = tickFormat,
): void {
  svg.appendChild(svgEl("line", { x1: box.left, x2: box.right, y1: box.bottom, y2: box.bottom, stroke: theme.grid }));
  for (const t of x.ticks(5)) {
    svg.appendChild(svgEl("text", { x: x(t), y: box.bottom + 11, "text-anchor": "middle", "font-size": 8.5, "font-family": MONO, fill: theme.ink.muted })).textContent = format(t);
  }
}

/** An axis title, centred under the plot (x) or above its left edge (y). */
export function axisTitle(svg: SVGElement, theme: ThemeTokens, text: string, x: number, y: number, anchor: "middle" | "start" = "middle"): void {
  svg.appendChild(svgEl("text", { x, y, "text-anchor": anchor, "font-size": 9, "font-family": "system-ui, sans-serif", fill: theme.ink.secondary })).textContent = text;
}
