import { describe, expect, it } from "vitest";
import { TARGETS, emit, recommendAndExport, toSpec } from "../src/export/index.js";
import type { Mapped } from "../src/recommend/map.js";

const note = { id: "n", severity: "info" as const, rule: "R13", text: "A derivation note." };
const mapped = (chart: string, data: unknown, options: Record<string, unknown> = {}): Mapped => ({ chart, data, options, notes: [note] });

const months = ["Jan", "Feb", "Mar", "Apr"];
const CASES: Mapped[] = [
  mapped("concentration-curve", [500, 300, 60, 40], { metricLabel: "revenue", populationLabel: "regions" }),
  mapped("treemap", { name: "revenue", children: [{ name: "North", value: 500 }, { name: "South", value: 300 }] }),
  mapped("seasonal-overlay", [
    { label: "2022", points: [1, 2, 3, 4] },
    { label: "2023", points: [2, 3, 4], emphasis: "current" },
  ], { xTickLabels: months, baselineValue: 2 }),
  mapped("bump", { series: [{ id: "A", label: "A", colorIndex: 0 }, { id: "B", label: "B", colorIndex: 1 }], points: months.flatMap((p, i) => [{ seriesId: "A", period: p, rank: (i % 2) + 1 }, { seriesId: "B", period: p, rank: ((i + 1) % 2) + 1 }]) }),
  mapped("football-field", [{ label: "DCF", low: 41, high: 58 }, { label: "Comps", low: 45, high: 53 }]),
  mapped("tornado", [{ label: "Price", low: 60, high: 140, base: 100 }, { label: "Cost", low: 80, high: 115, base: 100 }]),
  mapped("bullet", [{ label: "Revenue", ranges: [56, 72], actual: 71, target: 80 }]),
  mapped("bar", [{ label: "North", value: 500 }, { label: "South", value: 300 }, { label: "East", value: -20 }]),
  mapped("line", { x: months, series: [{ label: "Sales", values: [3, 4, 5, 6] }] }, { yLabel: "Sales" }),
  mapped("line", { x: months, series: [{ label: "A", values: [3, null, 5, 6] }, { label: "B", values: [1, 2, 3, 4] }] }),
  mapped("scatter", [{ x: 1, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 5 }], { xLabel: "spend", yLabel: "sales" }),
  mapped("histogram", Array.from({ length: 40 }, (_, i) => (i * 7) % 23), { label: "income" }),
  mapped("ecdf", [1, 2, 2, 3, 5, 8, 13], { label: "wait" }),
];

describe("export: every mappable chart reaches every target", () => {
  for (const m of CASES) {
    it(`${m.chart}: builds a spec and all six outputs`, () => {
      const spec = toSpec(m)!;
      expect(spec.chart).toBe(m.chart);
      expect(spec.notes).toContain("A derivation note.");
      for (const target of TARGETS) {
        const out = emit(spec, target);
        expect(out.target).toBe(target);
        expect(JSON.stringify(out.body).length).toBeGreaterThan(200);
      }
    });
  }

  it("returns null for a chart it cannot express", () => {
    expect(toSpec(mapped("sankey", {}))).toBeNull();
  });
});

describe("export: what each target emits", () => {
  const spec = toSpec(CASES[5])!; // tornado

  it("Vega-Lite is a layered v5 spec with the base-case tick and both swings", () => {
    const vl = emit(spec, "vega-lite").body as { $schema: string; layer: { mark: { type: string } | string }[] };
    expect(vl.$schema).toMatch(/vega-lite\/v5/);
    expect(vl.layer.map((l) => (typeof l.mark === "string" ? l.mark : l.mark.type))).toEqual(["bar", "bar", "tick"]);
  });

  it("Observable Plot is an ES module using barX and tickX with the category order fixed", () => {
    const code = emit(spec, "observable-plot").body as string;
    expect(code).toContain(`import * as Plot from "@observablehq/plot"`);
    expect(code).toContain("Plot.barX");
    expect(code).toContain("Plot.tickX");
    expect(code).toContain(`domain: ["Price","Cost"]`);
  });

  it("matplotlib and seaborn are Python; seaborn adds its theme and matplotlib does not import it", () => {
    const mpl = emit(spec, "matplotlib").body as string;
    const sns = emit(spec, "seaborn").body as string;
    expect(mpl).toContain("ax.barh");
    expect(mpl).not.toContain("seaborn");
    expect(sns).toContain("import seaborn as sns");
    expect(sns).toContain("sns.set_theme");
  });

  it("seaborn draws line and scatter marks with seaborn calls", () => {
    const sns = emit(toSpec(CASES[3])!, "seaborn").body as string; // bump
    expect(sns).toContain("sns.lineplot");
    expect(sns).toContain("sns.scatterplot");
  });

  it("Plotly is Python graph_objects with horizontal bars, the base-case marker and a reversed category axis", () => {
    const code = emit(spec, "plotly").body as string;
    expect(code).toContain("import plotly.graph_objects as go");
    expect(code).toContain(`go.Bar(orientation="h"`);
    expect(code).toContain(`symbol="line-ns"`);
    expect(code).toContain(`autorange="reversed"`);
  });

  it("ECharts is an ES module exporting an option, with a custom range series and real functions", () => {
    const code = emit(spec, "echarts").body as string;
    expect(code).toContain("export const option =");
    expect(code).toContain(`"type": "custom"`);
    expect(code).toContain("api.coord");
    expect(code).not.toContain("__range__");
  });

  it("ECharts draws a real treemap where the other targets fall back to bars", () => {
    const code = emit(toSpec(CASES[1])!, "echarts").body as string;
    expect(code).toContain(`"type": "treemap"`);
    expect(code).not.toContain("Approximation");
  });

  it("the treemap stand-in says it is an approximation, in the spec and in each output", () => {
    const tree = toSpec(CASES[1])!;
    expect(tree.approximation).toMatch(/no treemap/);
    expect(emit(tree, "matplotlib").body as string).toContain("# Approximation:");
    expect((emit(tree, "vega-lite").body as { usermeta: unknown }).usermeta).toBeTruthy();
  });

  it("histogram: the bin mark reaches each target with equal-width bins that cover every value", () => {
    const spec = toSpec(CASES.find((c) => c.chart === "histogram")!)!;
    const layer = spec.layers[0];
    expect(layer.mark).toBe("bin");
    if (layer.mark !== "bin") return;
    const widths = layer.data.map((d) => (d.x1 as number) - (d.x0 as number));
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1e-9);
    expect(layer.data.reduce((a, d) => a + (d.y as number), 0)).toBe(40);
    const vl = emit(spec, "vega-lite").body as { layer: { mark: { type: string }; encoding: { x: { bin: unknown } } }[] };
    expect(vl.layer[0].encoding.x.bin).toEqual({ binned: true });
    expect(emit(spec, "observable-plot").body as string).toContain("Plot.rectY");
    expect(emit(spec, "matplotlib").body as string).toContain(`align="edge"`);
    expect(emit(spec, "seaborn").body as string).toContain(`align="edge"`);
    expect(emit(spec, "plotly").body as string).toContain("go.Bar(x=");
    const ec = emit(spec, "echarts").body as string;
    expect(ec).toContain("api.coord");
    expect(ec).not.toContain("__bin__");
  });

  it("ecdf: is a true step function that ends at 100%", () => {
    const spec = toSpec(CASES.find((c) => c.chart === "ecdf")!)!;
    const line = spec.layers.find((l) => l.mark === "line");
    if (line?.mark !== "line") throw new Error("no line");
    const ys = line.data.map((d) => d.y as number);
    expect(ys[ys.length - 1]).toBe(1);
    expect(line.data[0]).toEqual({ x: 1, y: 0 });
    // Every corner shares an x with the next point (vertical rise) and then runs flat to the next value.
    expect(line.data[1].x).toBe(1);
    expect(line.data.every((d, i) => i === 0 || (d.y as number) >= (line.data[i - 1].y as number))).toBe(true);
  });

  it("line: a missing value is left out of the export and the note says so", () => {
    const spec = toSpec(CASES.filter((c) => c.chart === "line")[1])!;
    expect(spec.notes.join(" ")).toMatch(/Missing periods/);
    const l = spec.layers[0];
    if (l.mark !== "line") throw new Error("no line");
    expect(l.data.filter((d) => d.series === "A")).toHaveLength(3);
  });

  it("scatter without series still exports to matplotlib without grouping by a series column", () => {
    const code = emit(toSpec(CASES.find((c) => c.chart === "scatter")!)!, "matplotlib").body as string;
    expect(code).not.toContain("groupby");
    expect(code).toContain("ax.scatter");
  });

  it("rejects an unknown target with the valid list", () => {
    expect(() => emit(spec, "d4" as never)).toThrow(/vega-lite, observable-plot, matplotlib, seaborn, plotly/);
  });
});

describe("recommendAndExport: recommend, then export", () => {
  const regional = [["North", 500], ["South", 300], ["East", 60], ["West", 40], ["Central", 30], ["Islands", 25], ["Coast", 20], ["Hills", 15], ["Desert", 10]].map(([region, revenue]) => ({ region, revenue: `$${revenue}` }));

  it("exports the recommended chart with the insight as the title and the caveats kept", () => {
    const out = recommendAndExport(regional, "vega-lite");
    expect(out.recommendation.chart?.chart).toBe("concentration-curve");
    expect(out.spec?.title).toMatch(/top 2 of 9/);
    expect(out.output?.target).toBe("vega-lite");
    expect(out.mapping?.chart).toBe("concentration-curve");
  });

  it("gives the same chart to every target", () => {
    for (const target of TARGETS) {
      const out = recommendAndExport(regional, target);
      expect(out.output?.target).toBe(target);
      expect(out.spec?.chart).toBe("concentration-curve");
    }
  });

  it("exports nothing, with a reason, when the right answer is a number", () => {
    const out = recommendAndExport([{ team: "A", score: 10 }, { team: "B", score: 14 }], "matplotlib");
    expect(out.output).toBeUndefined();
    expect(out.message).toBeTruthy();
  });

  it("exports the chart when forced even though a table would serve better", () => {
    const flat = ["a", "b", "c", "d", "e"].map((k, i) => ({ k, v: 100 + (i % 2) }));
    expect(recommendAndExport(flat, "seaborn").output).toBeUndefined();
    expect(recommendAndExport(flat, "seaborn", { forceChart: true }).output?.target).toBe("seaborn");
  });
});
