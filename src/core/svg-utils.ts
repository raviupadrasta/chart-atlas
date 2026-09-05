const SVG_NS = "http://www.w3.org/2000/svg";

/** Create an SVG element with attributes in one call — the DOM equivalent of a JSX tag. */
export function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

/** Remove all children of an element — used before each re-render. */
export function clear(node: Element): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export type Point = [number, number];

/**
 * Catmull-Rom-to-Bezier smoothing through a list of points. Backs every
 * organic-shaped mark in the library — ridgeline hills, violin profiles,
 * streamgraph bands, fan-chart edges, horizon-chart bands.
 */
export function smoothPath(pts: Point[]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/** Point on a circle of radius `r` at `angleDeg`, measured clockwise from 12 o'clock. */
export function polarPoint(cx: number, cy: number, r: number, angleDeg: number): Point {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

/** Path for one donut/arc segment — the primitive behind sunburst and chord-diagram arcs. */
export function donutSegmentPath(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const large = endAngle - startAngle > 180 ? 1 : 0;
  const [x0, y0] = polarPoint(cx, cy, outerRadius, startAngle);
  const [x1, y1] = polarPoint(cx, cy, outerRadius, endAngle);
  const [x2, y2] = polarPoint(cx, cy, innerRadius, endAngle);
  const [x3, y3] = polarPoint(cx, cy, innerRadius, startAngle);
  return (
    `M${x0.toFixed(1)},${y0.toFixed(1)} A${outerRadius},${outerRadius} 0 ${large} 1 ${x1.toFixed(1)},${y1.toFixed(1)} ` +
    `L${x2.toFixed(1)},${y2.toFixed(1)} A${innerRadius},${innerRadius} 0 ${large} 0 ${x3.toFixed(1)},${y3.toFixed(1)} Z`
  );
}

/**
 * Rough single-line text width estimate in viewBox units, for "does this label
 * fit" decisions made before layout (we can't call getBBox before the node is
 * in the DOM at final size). Deliberately conservative — mark specs require
 * never clipping a label, so overestimating width (skip the label sooner) is
 * the safe direction to be wrong in.
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.62;
}
