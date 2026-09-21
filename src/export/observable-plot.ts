import type { Axis, ChartSpec, Layer, Tone } from "./spec.js";
import { DASH, gridAxes, hasLegend, legendSeries, margins, STYLE, titleLines } from "./style.js";

const js = (v: unknown): string => JSON.stringify(v);
const { font, color, mark } = STYLE;

function scale(a: Axis): string {
  const parts: string[] = [];
  parts.push(`label: ${js(a.title ?? null)}`, `labelAnchor: "center"`, `labelArrow: "none"`);
  if (a.kind === "category" && a.order) parts.push(`domain: ${js(a.order)}`);
  if (a.kind === "category" && a.order && a.tickEvery) parts.push(`ticks: ${js(a.order.filter((_, i) => i % a.tickEvery! === 0))}`);
  if (a.reverse) parts.push(`reverse: true`);
  if (a.zero) parts.push(`zero: true`);
  if (a.integer) parts.push(`interval: 1`, `tickFormat: "d"`);
  return `{ ${parts.join(", ")} }`;
}

function mark_(l: Layer, i: number, spec: ChartSpec, m: ReturnType<typeof margins>): string {
  const d = `d${i}`;
  const fill = (t: Tone | undefined) => js(color.tone[t ?? "accent"]);
  const rowPx = (spec.size.height - m.top - m.bottom) / Math.max(1, spec.y.order?.length ?? 1);
  const inset = (share: number) => `insetTop: ${Math.round(((1 - share) / 2) * rowPx)}, insetBottom: ${Math.round(((1 - share) / 2) * rowPx)}`;
  switch (l.mark) {
    case "line": {
      const seriesOpts = l.data.some((r) => r.series !== undefined) ? `, z: "series"` : "";
      const stroke = l.colorBySeries ? `"series"` : fill(l.tone);
      return `Plot.line(${d}, { x: "x", y: "y"${seriesOpts}, stroke: ${stroke}, strokeWidth: ${l.thick ? mark.lineThick : mark.lineThin}${l.dash ? `, strokeDasharray: ${js(DASH)}` : ""} })`;
    }
    case "point":
      return `Plot.dot(${d}, { x: "x", y: "y", fill: ${l.colorBySeries ? `"series"` : fill(l.tone)}, r: ${mark.pointSize / 2} })`;
    case "range":
      return `Plot.barX(${d}, { y: "y", x1: "x0", x2: "x1", fill: ${fill(l.tone)}, ${inset(l.thin ? mark.barThin : mark.barFull)} })`;
    case "bin":
      return `Plot.rectY(${d}, { x1: "x0", x2: "x1", y: "y", fill: ${fill(l.tone)}, insetLeft: 0.5, insetRight: 0.5 })`;
    case "tick":
      return `Plot.tickX(${d}, { y: "y", x: "x", stroke: ${fill(l.tone)}, strokeWidth: ${mark.tickWidth} })`;
    case "rule":
      return `Plot.rule${l.axis.toUpperCase()}([${l.value}], { stroke: ${fill(l.tone)}, strokeWidth: ${mark.ruleWidth}${l.dash ? `, strokeDasharray: ${js(DASH)}` : ""} })`;
  }
}

/** Runnable JavaScript (ES module) that builds the chart with Observable Plot and returns an SVG element. */
export function toObservablePlot(spec: ChartSpec): string {
  const m = margins(spec);
  // Height taken by the HTML title block above the plot; the plot gets the rest of the outer height.
  const titleBlock = m.top - 12;
  const data = spec.layers.map((l, i) => (l.mark === "rule" ? null : `const d${i} = ${js(l.data)};`)).filter(Boolean);
  const lines = [
    `// ${spec.title}`,
    ...spec.notes.map((n) => `// Note: ${n}`),
    ...(spec.approximation ? [`// Approximation: ${spec.approximation}`] : []),
    `import * as Plot from "@observablehq/plot";`,
    ``,
    ...data,
    ``,
    `const plot = Plot.plot({`,
    `  width: ${spec.size.width},`,
    `  height: ${spec.size.height - titleBlock},`,
    `  marginLeft: ${m.left},`,
    `  marginRight: ${m.right},`,
    `  marginTop: 12,`,
    `  marginBottom: ${m.bottom},`,
    `  style: { fontFamily: ${js(font.family)}, fontSize: "${font.size.tick}px", color: ${js(color.inkSecondary)}, background: ${js(color.surface)} },`,
    `  x: ${scale(spec.x)},`,
    `  y: ${scale(spec.y)},`,
    ...(hasLegend(spec) ? [`  color: { range: ${js(color.series)}, legend: false },`] : []),
    `  marks: [`,
    ...(gridAxes(spec).x ? [`    Plot.gridX({ stroke: ${js(color.grid)}, strokeWidth: ${mark.gridWidth} }),`] : []),
    ...(gridAxes(spec).y ? [`    Plot.gridY({ stroke: ${js(color.grid)}, strokeWidth: ${mark.gridWidth} }),`] : []),
    ...spec.layers.map((l, i) => `    ${mark_(l, i, spec, m)},`),
    `  ],`,
    `});`,
    ``,
    `// Title, notes and legend are plain HTML so their size matches the other exports.`,
    `const figure = document.createElement("figure");`,
    `figure.style.cssText = ${js(`margin:0;width:${spec.size.width}px;background:${color.surface};font-family:${font.family}`)};`,
    `const title = document.createElement("div");`,
    `title.style.cssText = ${js(`padding:${STYLE.space.titleTop}px 8px 0;font-size:${font.size.title}px;font-weight:${font.titleWeight};line-height:1.3;color:${color.ink};white-space:pre-line`)};`,
    `title.textContent = ${js(titleLines(spec.title).join("\n"))};`,
    `figure.append(title);`,
    ...(spec.notes.length
      ? [`const notes = document.createElement("div");`, `notes.style.cssText = ${js(`padding:4px 8px 0;font-size:${font.size.subtitle}px;color:${color.inkSecondary}`)};`, `notes.textContent = ${js(spec.notes.join(" · "))};`, `figure.append(notes);`]
      : []),
    ...(hasLegend(spec)
      ? [
          `const legend = document.createElement("div");`,
          `legend.style.cssText = ${js(`position:absolute;right:8px;top:${STYLE.space.titleTop}px;font-size:${font.size.legend}px;color:${color.inkSecondary}`)};`,
          `${js(legendSeries(spec))}.forEach((name, i) => {`,
          `  const row = document.createElement("div");`,
          `  row.innerHTML = '<span style="display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;background:' + ${js(color.series)}[i] + '"></span>' + name;`,
          `  legend.append(row);`,
          `});`,
          `figure.style.position = "relative";`,
          `figure.append(legend);`,
        ]
      : []),
    `figure.append(plot);`,
    `export const chart = figure;`,
    ``,
    `// document.body.append(chart);`,
  ];
  return lines.join("\n");
}
