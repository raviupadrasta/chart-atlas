import type { ChartSpec, Datum, Layer, Tone } from "./spec.js";
import { gridAxes, hasLegend, legendSeries, margins, STYLE, titleLines } from "./style.js";

const { font, color, mark } = STYLE;

const py = (v: unknown): string => JSON.stringify(v);
const col = (data: Datum[], key: keyof Datum): string => py(data.map((d) => d[key]));
const tone = (t: Tone | undefined) => py(color.tone[t ?? "accent"]);
const DASH = py(mark.dash.join(" "));

/** One trace per series (or a single trace when the layer has no series). */
function seriesGroups(data: Datum[]): { name?: string; rows: Datum[] }[] {
  if (!data.some((d) => d.series !== undefined)) return [{ rows: data }];
  const by = new Map<string, Datum[]>();
  for (const d of data) by.set(d.series ?? "", [...(by.get(d.series ?? "") ?? []), d]);
  return [...by].map(([name, rows]) => ({ name, rows }));
}

function traces(l: Layer, seriesIndex: Map<string, number>): string[] {
  switch (l.mark) {
    case "line":
    case "point": {
      return seriesGroups(l.data).map(({ name, rows }) => {
        const c = l.colorBySeries && name !== undefined ? py(color.series[(seriesIndex.get(name) ?? 0) % color.series.length]) : tone(l.tone);
        const isLine = l.mark === "line";
        const style = isLine
          ? `mode="lines", line=dict(color=${c}, width=${l.thick ? mark.lineThick : mark.lineThin}${l.dash ? `, dash=${DASH}` : ""})`
          : `mode="markers", marker=dict(color=${c}, size=${mark.pointSize})`;
        const legend = isLine && l.colorBySeries && name !== undefined ? `, name=${py(name)}, legendgroup=${py(name)}` : `, showlegend=False${l.colorBySeries && name !== undefined ? `, legendgroup=${py(name)}` : ""}`;
        return `fig.add_trace(go.Scatter(x=${col(rows, "x")}, y=${col(rows, "y")}, ${style}${legend}, hoverinfo="x+y+name"))`;
      });
    }
    case "range": {
      const w = l.thin ? mark.barThin : mark.barFull;
      const x1 = py(l.data.map((d) => (d.x1 as number) - (d.x0 as number)));
      return [`fig.add_trace(go.Bar(orientation="h", y=${col(l.data, "y")}, x=${x1}, base=${col(l.data, "x0")}, width=${w}, marker_color=${tone(l.tone)}, showlegend=False, hoverinfo="y"))`];
    }
    case "tick":
      return [`fig.add_trace(go.Scatter(x=${col(l.data, "x")}, y=${col(l.data, "y")}, mode="markers", marker=dict(symbol="line-ns", size=${mark.tickLength}, line=dict(color=${tone(l.tone)}, width=${mark.tickWidth})), showlegend=False, hoverinfo="x"))`];
    case "rule":
      return [`fig.add_${l.axis === "x" ? "v" : "h"}line(${l.axis === "x" ? "x" : "y"}=${l.value}, line=dict(color=${tone(l.tone)}, width=${mark.ruleWidth}${l.dash ? `, dash=${DASH}` : ""}))`];
  }
}

function axis(spec: ChartSpec, name: "x" | "y"): string[] {
  const a = spec[name];
  const opts: string[] = [`title_text=${py(a.title ?? "")}`, `showgrid=${gridAxes(spec)[name] ? "True" : "False"}`, `gridcolor=${py(color.grid)}`, `gridwidth=${mark.gridWidth}`, `title_font_size=${font.size.axisTitle}`, `linecolor=${py(color.grid)}`, `zeroline=False`];
  if (a.kind === "category") opts.push(`type="category"`, `categoryorder="array"`, `categoryarray=${py(a.order ?? [])}`);
  if (name === "y" && a.kind === "category") opts.push(`autorange="reversed"`);
  else if (a.reverse) opts.push(`autorange="reversed"`);
  if (a.kind === "linear" && a.zero) opts.push(`rangemode="tozero"`);
  if (a.integer) opts.push(`dtick=1`);
  return [`fig.update_${name}axes(${opts.join(", ")})`];
}

/** Runnable Python that draws the chart with Plotly (graph_objects) and shows it interactively. */
export function toPlotly(spec: ChartSpec): string {
  const m = margins(spec);
  const names = legendSeries(spec);
  const seriesIndex = new Map(names.map((n, i) => [n, i]));
  const lines = [
    `# ${spec.title}`,
    ...spec.notes.map((n) => `# Note: ${n}`),
    ...(spec.approximation ? [`# Approximation: ${spec.approximation}`] : []),
    `import plotly.graph_objects as go`,
    ``,
    `fig = go.Figure()`,
    ...spec.layers.flatMap((l) => traces(l, seriesIndex)),
    ...axis(spec, "x"),
    ...axis(spec, "y"),
    `fig.update_layout(`,
    `    title=dict(text=${py(titleLines(spec.title).join("<br>") + (spec.notes.length ? `<br><span style="font-size:${font.size.subtitle}px;color:${color.inkSecondary};font-weight:normal">${spec.notes.join(" · ")}</span>` : ""))}, x=${8 / spec.size.width}, xref="container", y=${1 - (STYLE.space.titleTop + font.size.title + 2) / spec.size.height}, yref="container", yanchor="top", xanchor="left", font=dict(size=${font.size.title}, color=${py(color.ink)})),`,
    `    width=${spec.size.width}, height=${spec.size.height},`,
    `    margin=dict(l=${m.left}, r=${m.right}, t=${m.top}, b=${m.bottom}),`,
    `    barmode="overlay", plot_bgcolor=${py(color.surface)}, paper_bgcolor=${py(color.surface)},`,
    `    font=dict(family=${py(font.familyPython.join(", "))}, size=${font.size.tick}, color=${py(color.inkSecondary)}),`,
    ...(hasLegend(spec) ? [`    legend=dict(x=1.02, y=1, xanchor="left", yanchor="top", font=dict(size=${font.size.legend})),`] : []),
    `    hovermode="closest",`,
    `)`,
    `fig.show()`,
  ];
  return lines.join("\n");
}
