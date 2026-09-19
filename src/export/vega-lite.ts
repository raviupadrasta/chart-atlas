import type { Axis, ChartSpec, Layer, Tone } from "./spec.js";
import { hasLegend, margins, STYLE, titleLines } from "./style.js";

type Json = Record<string, unknown>;
const { font, color, mark } = STYLE;

const axisEnc = (a: Axis, ax: "x" | "y", extra: Json = {}): Json => {
  const enc: Json = { field: ax, type: a.kind === "category" ? "ordinal" : "quantitative", ...extra };
  enc.title = a.title ?? null;
  if (a.kind === "category" && a.order) enc.sort = a.order;
  const scale: Json = {};
  if (a.reverse) Object.assign(scale, { reverse: true, padding: 12 });
  if (a.zero !== undefined && a.kind === "linear") scale.zero = a.zero;
  if (Object.keys(scale).length) enc.scale = scale;
  if (a.kind === "category") enc.axis = { grid: false, labelAngle: 0 };
  if (a.integer) enc.axis = { tickMinStep: 1, format: "d" };
  return enc;
};

function colorEnc(layer: { tone?: Tone; colorBySeries?: boolean }): Json {
  if (layer.colorBySeries) return { color: { field: "series", type: "nominal", scale: { range: color.series }, legend: { title: null } } };
  return { color: { value: color.tone[layer.tone ?? "accent"] } };
}

function layer(l: Layer, spec: ChartSpec): Json {
  const { x, y } = spec;
  switch (l.mark) {
    case "line":
      return {
        data: { values: l.data },
        mark: { type: "line", strokeWidth: l.thick ? mark.lineThick : mark.lineThin, ...(l.dash ? { strokeDash: mark.dash } : {}) },
        encoding: { x: axisEnc(x, "x"), y: axisEnc(y, "y"), ...(l.data.some((d) => d.series !== undefined) ? { detail: { field: "series", type: "nominal" } } : {}), ...colorEnc(l) },
      };
    case "point":
      return { data: { values: l.data }, mark: { type: "point", filled: true, size: mark.pointSize ** 2 }, encoding: { x: axisEnc(x, "x"), y: axisEnc(y, "y"), ...colorEnc(l) } };
    case "range":
      return {
        data: { values: l.data },
        mark: { type: "bar", height: { band: l.thin ? mark.barThin : mark.barFull } },
        encoding: { y: axisEnc(y, "y"), x: axisEnc(x, "x", { field: "x0" }), x2: { field: "x1" }, ...colorEnc(l) },
      };
    case "tick":
      return { data: { values: l.data }, mark: { type: "tick", thickness: mark.tickWidth, size: mark.tickLength }, encoding: { y: axisEnc(y, "y"), x: axisEnc(x, "x"), ...colorEnc(l) } };
    case "rule":
      return {
        data: { values: [{ v: l.value }] },
        mark: { type: "rule", strokeWidth: mark.ruleWidth, ...(l.dash ? { strokeDash: mark.dash } : {}) },
        encoding: { [l.axis]: { field: "v", type: "quantitative" }, color: { value: color.tone[l.tone ?? "muted"] } },
      };
  }
}

/** A Vega-Lite v5 spec (plain JSON) for the chart. Load it with vega-embed, Altair's `alt.Chart.from_dict`, or the Vega editor. */
export function toVegaLite(spec: ChartSpec): Json {
  const m = margins(spec);
  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    title: { text: titleLines(spec.title), ...(spec.notes.length ? { subtitle: spec.notes } : {}), anchor: "start", color: color.ink, subtitleColor: color.inkSecondary, font: font.family, fontSize: font.size.title, fontWeight: font.titleWeight, subtitleFont: font.family, subtitleFontSize: font.size.subtitle, subtitlePadding: 4 },
    // Outer size is fixed; Vega-Lite sizes the plot inside it and lays axes and legend out itself.
    width: spec.size.width,
    height: spec.size.height,
    autosize: { type: "fit", contains: "padding" },
    padding: { left: 8, right: hasLegend(spec) ? 8 : m.right - 20, top: STYLE.space.titleTop, bottom: 8 },
    background: color.surface,
    layer: spec.layers.map((l) => layer(l, spec)),
    config: {
      font: font.family,
      axis: { gridColor: color.grid, gridWidth: mark.gridWidth, domainColor: color.grid, tickColor: color.grid, labelColor: color.inkSecondary, titleColor: color.inkSecondary, labelFont: font.family, titleFont: font.family, labelFontSize: font.size.tick, titleFontSize: font.size.axisTitle, titleFontWeight: "normal" },
      legend: { labelFont: font.family, labelFontSize: font.size.legend, labelColor: color.inkSecondary },
      view: { stroke: null },
    },
    ...(spec.approximation ? { usermeta: { approximation: spec.approximation } } : {}),
  };
}
