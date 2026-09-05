import { describe, expect, it } from "vitest";
import { bulletChart } from "../src/charts/bullet.js";
import { treemapChart } from "../src/charts/treemap.js";
import { sankeyChart, type SankeyData } from "../src/charts/sankey.js";
import { THEMES } from "../src/theme/tokens.js";

function mount(): HTMLDivElement {
  const div = document.createElement("div");
  document.body.appendChild(div);
  return div;
}

describe("bulletChart", () => {
  it("renders, updates, and tears down cleanly", () => {
    const el = mount();
    const data = [{ label: "Revenue", ranges: [40, 70] as [number, number], actual: 78, target: 85, max: 100 }];
    const chart = bulletChart(el, data, { theme: "light" });

    const svg = el.querySelector("svg");
    expect(svg).not.toBeNull();
    // background + label + 3 bands + actual bar + target tick = 6 nodes for one row
    expect(svg!.children.length).toBeGreaterThanOrEqual(6);

    chart.update([{ label: "Revenue", ranges: [10, 20] as [number, number], actual: 15, target: 18, max: 30 }]);
    expect(el.querySelector("svg")).not.toBeNull();

    chart.destroy();
    expect(el.innerHTML).toBe("");
  });
});

describe("treemapChart", () => {
  it("assigns each top-level child its own fixed categorical slot", () => {
    const el = mount();
    const data = {
      name: "root",
      children: [
        { name: "A", value: 50 },
        { name: "B", value: 30 },
        { name: "C", value: 20 },
      ],
    };
    treemapChart(el, data, { theme: "light" });

    const rects = [...el.querySelectorAll("rect")].filter((r) => r.getAttribute("fill") !== THEMES.light.surface);
    expect(rects).toHaveLength(3);
    const fills = rects.map((r) => r.getAttribute("fill"));
    expect(fills).toEqual([
      THEMES.light.categorical[0],
      THEMES.light.categorical[1],
      THEMES.light.categorical[2],
    ]);
  });

  it("folds children past the categorical cap into Other", () => {
    const el = mount();
    const many = Array.from({ length: 10 }, (_, i) => ({ name: `Slice ${i}`, value: 10 }));
    treemapChart(el, { name: "root", children: many }, { theme: "light" });
    const rects = [...el.querySelectorAll("rect")].filter((r) => r.getAttribute("fill") !== THEMES.light.surface);
    // capped at palette length (8): 7 real slices + 1 "Other"
    expect(rects.length).toBe(THEMES.light.categorical.length);
  });
});

describe("sankeyChart", () => {
  const data: SankeyData = {
    nodes: [
      { id: "visitors", label: "Visitors" },
      { id: "signedup", label: "Signed up", colorIndex: 0 },
      { id: "purchased", label: "Purchased", colorIndex: 2 },
    ],
    links: [
      { source: "visitors", target: "signedup", value: 100 },
      { source: "signedup", target: "purchased", value: 60 },
    ],
  };

  it("resolves each link's color from its source node's colorIndex through the d3-sankey layout mutation", () => {
    // This is the fragile part of the implementation: d3-sankey mutates our
    // plain {id, label, colorIndex} objects into laid-out nodes, and link.source
    // becomes a reference to that mutated node (not the original index/id). If
    // the `as unknown as LaidOutNode` cast were wrong about that shape, this is
    // the test that would catch it — the "renders without throwing" checks below
    // would not.
    const el = mount();
    sankeyChart(el, data, { theme: "light" });
    const paths = [...el.querySelectorAll("path")];
    expect(paths).toHaveLength(2);

    // visitors -> signedup: source node "visitors" has no colorIndex -> muted
    const mutedLink = paths.find((p) => p.getAttribute("fill") === THEMES.light.ink.muted);
    expect(mutedLink, "visitors→signedup ribbon should render muted (source has no colorIndex)").toBeDefined();

    // signedup -> purchased: source node "signedup" has colorIndex 0 -> categorical slot 0
    const coloredLink = paths.find((p) => p.getAttribute("fill") === THEMES.light.categorical[0]);
    expect(coloredLink, "signedup→purchased ribbon should render in categorical slot 0").toBeDefined();
  });

  it("renders one rect per node and updates without throwing", () => {
    const el = mount();
    const chart = sankeyChart(el, data, { theme: "light" });
    expect(el.querySelectorAll("rect")).toHaveLength(data.nodes.length + 1); // +1 background rect

    expect(() => chart.update({ ...data, links: [...data.links, { source: "visitors", target: "purchased", value: 5 }] })).not.toThrow();
    chart.destroy();
    expect(el.innerHTML).toBe("");
  });
});
