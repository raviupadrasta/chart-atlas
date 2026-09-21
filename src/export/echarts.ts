import type { Axis, ChartSpec, Datum, Layer, Tone } from "./spec.js";
import { hasLegend, legendSeries, margins, STYLE, titleLines } from "./style.js";

type Json = Record<string, unknown>;
const { font, color, mark } = STYLE;
const tone = (t: Tone | undefined) => color.tone[t ?? "accent"];

function axis(a: Axis, horizontalBars: boolean, values: number[] = []): Json {
  const out: Json = {
    name: a.title ?? "",
    nameLocation: "middle",
    nameGap: 32,
    nameTextStyle: { color: color.inkSecondary, fontSize: font.size.axisTitle },
    axisLabel: { color: color.inkSecondary, fontSize: font.size.tick },
    axisLine: { lineStyle: { color: color.grid } },
    axisTick: { lineStyle: { color: color.grid } },
    splitLine: { show: a.kind === "linear", lineStyle: { color: color.grid, width: mark.gridWidth } },
  };
  if (a.kind === "category") {
    Object.assign(out, { type: "category", data: a.order ?? [], boundaryGap: horizontalBars });
    if (a.tickEvery) out.axisLabel = { ...(out.axisLabel as Json), interval: a.tickEvery - 1 };
    if (horizontalBars) out.inverse = true; // first category at the top
  } else {
    out.type = "value";
    if (a.zero === false) out.scale = true;
    if (a.reverse) out.inverse = true;
    if (a.integer && values.length) {
      // One empty step of padding each side, with its label hidden, so points are not clipped at the edge.
      Object.assign(out, { min: Math.min(...values) - 1, max: Math.max(...values) + 1, interval: 1, axisLabel: { color: color.inkSecondary, fontSize: font.size.tick, showMinLabel: false, showMaxLabel: false } });
    }
  }
  return out;
}

/** Marker for a renderItem function, swapped for real source when the option is serialised. */
const RANGE_FN = "__range__:";
const RANGE_SRC = (height: string) =>
  `(params, api) => {
      const start = api.coord([api.value(1), api.value(0)]);
      const end = api.coord([api.value(2), api.value(0)]);
      const h = api.size([0, 1])[1] * ${height};
      return { type: "rect", shape: { x: Math.min(start[0], end[0]), y: start[1] - h / 2, width: Math.abs(end[0] - start[0]), height: h }, style: { fill: api.visual("color") } };
    }`;

const BIN_FN = "__bin__";
const BIN_SRC = `(params, api) => {
      const a = api.coord([api.value(0), api.value(2)]);
      const b = api.coord([api.value(1), 0]);
      return { type: "rect", shape: { x: a[0] + 0.5, y: a[1], width: Math.max(0, b[0] - a[0] - 1), height: b[1] - a[1] }, style: { fill: api.visual("color") } };
    }`;

const pairs = (rows: Datum[]) => rows.map((d) => [d.x, d.y]);

function groups(data: Datum[]): { name?: string; rows: Datum[] }[] {
  if (!data.some((d) => d.series !== undefined)) return [{ rows: data }];
  const by = new Map<string, Datum[]>();
  for (const d of data) by.set(d.series ?? "", [...(by.get(d.series ?? "") ?? []), d]);
  return [...by].map(([name, rows]) => ({ name, rows }));
}

function series(l: Layer, i: number, seriesIndex: Map<string, number>, spec: ChartSpec): Json[] {
  switch (l.mark) {
    case "line":
    case "point":
      return groups(l.data).map(({ name, rows }) => {
        const c = l.colorBySeries && name !== undefined ? color.series[(seriesIndex.get(name) ?? 0) % color.series.length] : tone(l.tone);
        const base: Json = { name, data: pairs(rows), itemStyle: { color: c } };
        return l.mark === "line"
          ? { ...base, type: "line", symbol: "none", lineStyle: { color: c, width: l.thick ? mark.lineThick : mark.lineThin, ...(l.dash ? { type: "dashed" } : {}) } }
          : { ...base, type: "scatter", symbolSize: mark.pointSize, ...(l.colorBySeries ? { legendHoverLink: false } : {}) };
      });
    case "range": {
      // A custom series draws a rect from x0 to x1 centred on its category, so bars of different thickness
      // (a thin actual over wide bands) line up; ECharts' own bars would left-align them.
      const order = spec.y.order ?? [];
      return [
        {
          type: "custom",
          name: `range-${i}`,
          renderItem: `${RANGE_FN}${l.thin ? mark.barThin : mark.barFull}`,
          itemStyle: { color: tone(l.tone) },
          encode: { x: [1, 2], y: 0, tooltip: [3, 1, 2] },
          data: l.data.map((d) => [order.indexOf(String(d.y)), d.x0, d.x1, d.y]),
        },
      ];
    }
    case "bin":
      return [{ type: "custom", name: `bin-${i}`, renderItem: BIN_FN, itemStyle: { color: tone(l.tone) }, encode: { x: [0, 1], y: 2, tooltip: [0, 1, 2] }, data: l.data.map((d) => [d.x0, d.x1, d.y]) }];
    case "tick":
      return [{ type: "scatter", name: `tick-${i}`, data: l.data.map((d) => [d.x, d.y]), symbol: "rect", symbolSize: [mark.tickWidth, mark.tickLength], itemStyle: { color: tone(l.tone) }, z: 5 }];
    case "rule":
      return [
        {
          type: "line",
          name: `rule-${i}`,
          data: [],
          silent: true,
          markLine: { silent: true, symbol: "none", label: { show: false }, lineStyle: { color: tone(l.tone), width: mark.ruleWidth, type: l.dash ? "dashed" : "solid" }, data: [l.axis === "x" ? { xAxis: l.value } : { yAxis: l.value }] },
        },
      ];
  }
}

function buildOption(spec: ChartSpec): Json {
  const title = { text: titleLines(spec.title).join("\n"), ...(spec.notes.length ? { subtext: spec.notes.join(" · ") } : {}), left: 8, top: STYLE.space.titleTop, itemGap: 4, textStyle: { color: color.ink, fontSize: font.size.title, fontWeight: font.titleWeight }, subtextStyle: { color: color.inkSecondary, fontSize: font.size.subtitle } };
  const base = { backgroundColor: color.surface, textStyle: { fontFamily: font.family } };
  if (spec.treemap) {
    return {
      ...base,
      title,
      color: color.series,
      series: [{ type: "treemap", roam: false, nodeClick: false, breadcrumb: { show: false }, data: spec.treemap, label: { show: true, formatter: "{b}\n{c}", fontSize: font.size.tick }, itemStyle: { borderColor: color.surface, borderWidth: 2, gapWidth: 2 } }],
      tooltip: {},
    };
  }
  const m = margins(spec);
  const names = legendSeries(spec);
  const seriesIndex = new Map(names.map((n, k) => [n, k]));
  const horizontalBars = spec.layers.some((l) => l.mark === "range" || l.mark === "tick") && spec.y.kind === "category";
  return {
    ...base,
    title,
    animation: false,
    ...(hasLegend(spec) ? { legend: { data: names, right: 0, top: 8, icon: "roundRect", textStyle: { color: color.inkSecondary, fontSize: font.size.legend } } } : {}),
    tooltip: { trigger: horizontalBars ? "item" : "axis" },
    grid: { left: m.left, right: m.right, top: m.top, bottom: m.bottom, containLabel: false },
    xAxis: axis(spec.x, false),
    yAxis: axis(spec.y, horizontalBars, spec.layers.flatMap((l) => (l.mark === "line" || l.mark === "point" ? l.data.map((d) => Number(d.y)) : []))),
    series: spec.layers.flatMap((l, i) => series(l, i, seriesIndex, spec)),
  };
}

/** Runnable JavaScript (ES module) exporting an Apache ECharts `option`: pass it to `chart.setOption(option)`. */
export function toEcharts(spec: ChartSpec): string {
  const json = JSON.stringify(buildOption(spec), null, 2).replace(new RegExp(`"${RANGE_FN}([0-9.]+)"`, "g"), (_, h: string) => RANGE_SRC(h)).replace(`"${BIN_FN}"`, BIN_SRC);
  return [
    `// ${spec.title}`,
    ...spec.notes.map((n) => `// Note: ${n}`),
    ...(spec.treemap ? [] : spec.approximation ? [`// Approximation: ${spec.approximation}`] : []),
    `// Usage: const chart = echarts.init(el, null, { width: ${spec.size.width}, height: ${spec.size.height} }); chart.setOption(option);`,
    `export const option = ${json};`,
  ].join("\n");
}
