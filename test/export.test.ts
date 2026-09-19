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
];

describe("export: every mappable chart reaches every target", () => {
  for (const m of CASES) {
    it(`${m.chart}: builds a spec and all six outputs`, () => {
      const spec = toSpec(m)!;
      expect(spec.chart).toBe(m.chart);
      expect(spec.notes).toEqual(["A derivation note."]);
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
