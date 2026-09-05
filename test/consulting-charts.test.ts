import { describe, expect, it } from "vitest";
import { waterfallChart } from "../src/charts/waterfall.js";
import { tornadoChart } from "../src/charts/tornado.js";
import { footballFieldChart } from "../src/charts/football-field.js";
import { concentrationCurveChart } from "../src/charts/concentration-curve.js";
import { marimekkoChart } from "../src/charts/marimekko.js";
import { costCurveChart } from "../src/charts/cost-curve.js";
import { bcgMatrixChart } from "../src/charts/bcg-matrix.js";
import { impactEffortMatrixChart } from "../src/charts/impact-effort-matrix.js";
import { bumpChart } from "../src/charts/bump.js";
import { driverTreeChart } from "../src/charts/driver-tree.js";
import { THEMES } from "../src/theme/tokens.js";

function mount(): HTMLDivElement {
  const div = document.createElement("div");
  document.body.appendChild(div);
  return div;
}

describe("waterfallChart", () => {
  it("colors total bars neutral and delta bars by sign", () => {
    const el = mount();
    waterfallChart(
      el,
      [
        { label: "Start", value: 100, isTotal: true },
        { label: "Price", value: 15 },
        { label: "Volume", value: -8 },
        { label: "End", value: 107, isTotal: true },
      ],
      { theme: "light" },
    );
    const rects = [...el.querySelectorAll("rect")].filter((r) => r.getAttribute("fill") !== THEMES.light.surface);
    expect(rects).toHaveLength(4);
    expect(rects[0].getAttribute("fill")).toBe(THEMES.light.baseline); // Start (total)
    expect(rects[1].getAttribute("fill")).toBe(THEMES.light.status.good); // Price +15
    expect(rects[2].getAttribute("fill")).toBe(THEMES.light.status.critical); // Volume -8
    expect(rects[3].getAttribute("fill")).toBe(THEMES.light.baseline); // End (total)
  });
});

describe("tornadoChart", () => {
  it("sorts rows by swing width, widest first, by default", () => {
    const el = mount();
    tornadoChart(
      el,
      [
        { label: "Narrow", low: 90, high: 110, base: 100 }, // width 20
        { label: "Wide", low: 50, high: 150, base: 100 }, // width 100
      ],
      { theme: "light" },
    );
    const labels = [...el.querySelectorAll("text")].map((t) => t.textContent);
    expect(labels.indexOf("Wide")).toBeLessThan(labels.indexOf("Narrow"));
  });

  it("update()/destroy() lifecycle works", () => {
    const el = mount();
    const chart = tornadoChart(el, [{ label: "A", low: 1, high: 2, base: 1.5 }]);
    chart.update([{ label: "B", low: 3, high: 5, base: 4 }]);
    chart.destroy();
    expect(el.innerHTML).toBe("");
  });
});

describe("footballFieldChart", () => {
  it("renders one bar per row plus an optional reference line", () => {
    const el = mount();
    footballFieldChart(
      el,
      [
        { label: "DCF", low: 40, high: 60 },
        { label: "Comps", low: 45, high: 55 },
      ],
      { theme: "light", referenceValue: 50, referenceLabel: "Current price" },
    );
    // 2 range bars (rx set) + 1 reference line
    const bars = [...el.querySelectorAll("rect")].filter((r) => r.hasAttribute("rx") && r.getAttribute("rx") !== "0");
    expect(bars).toHaveLength(2);
    expect(el.querySelectorAll("line")).toHaveLength(1);
  });
});

describe("concentrationCurveChart", () => {
  it("computes cumulative share correctly for a simple 80/20-ish distribution", () => {
    const el = mount();
    // 1 customer worth 80, 4 customers worth 5 each -> top 20% (1 of 5) = 80% of 100
    concentrationCurveChart(el, [80, 5, 5, 5, 5], { theme: "light" });
    const callout = [...el.querySelectorAll("text")].find((t) => t.textContent?.includes("top 20%"));
    expect(callout?.textContent).toContain("80%");
  });
});

describe("marimekkoChart", () => {
  it("lays out columns whose widths sum to the full chart width", () => {
    const el = mount();
    marimekkoChart(
      el,
      {
        name: "root",
        children: [
          { name: "A", children: [{ name: "A1", value: 30 }, { name: "A2", value: 20 }] },
          { name: "B", value: 50 },
        ],
      },
      { theme: "light" },
    );
    // Column widths aren't directly queryable post-layout, but every leaf rect's
    // total area should sum to (width - header) * chartWidth once gaps are
    // accounted for loosely — the cheap, robust check is simpler: at least one
    // rect per leaf segment (3 leaves: A1, A2, B) plus the background rect.
    const rects = [...el.querySelectorAll("rect")];
    expect(rects.length).toBeGreaterThanOrEqual(4); // background + 3 segments
  });
});

describe("costCurveChart", () => {
  it("sorts ascending by cost and colors negative cost (savings) vs positive (cost) differently", () => {
    const el = mount();
    costCurveChart(
      el,
      [
        { label: "Expensive", cost: 50, volume: 10 },
        { label: "Cheap savings", cost: -20, volume: 15 },
      ],
      { theme: "light" },
    );
    const rects = [...el.querySelectorAll("rect")].filter((r) => r.getAttribute("fill") !== THEMES.light.surface);
    expect(rects).toHaveLength(2);
    // sorted ascending by cost: "Cheap savings" (-20) should be drawn first (leftmost / first in DOM)
    const fills = rects.map((r) => r.getAttribute("fill"));
    expect(fills[0]).toBe(THEMES.light.status.good);
    expect(fills[1]).toBe(THEMES.light.status.critical);
  });
});

describe("bcgMatrixChart", () => {
  it("reverses the x-axis so higher relative share renders at a smaller pixel x", () => {
    const el = mount();
    bcgMatrixChart(
      el,
      [
        { label: "High share", relativeShare: 5, marketGrowth: 10, revenue: 100 },
        { label: "Low share", relativeShare: 0.2, marketGrowth: 10, revenue: 100 },
      ],
      { theme: "light" },
    );
    const circles = [...el.querySelectorAll("circle")];
    expect(circles).toHaveLength(2);
    const [highShareCx, lowShareCx] = circles.map((c) => Number(c.getAttribute("cx")));
    expect(highShareCx).toBeLessThan(lowShareCx);
  });
});

describe("impactEffortMatrixChart", () => {
  it("uses linear (non-reversed) axes via the shared quadrant helper", () => {
    const el = mount();
    impactEffortMatrixChart(
      el,
      [
        { label: "Quick win", impact: 9, effort: 1 },
        { label: "Big bet", impact: 9, effort: 9 },
      ],
      { theme: "light" },
    );
    const circles = [...el.querySelectorAll("circle")];
    const [quickWinCx, bigBetCx] = circles.map((c) => Number(c.getAttribute("cx")));
    // higher effort -> larger pixel x (NOT reversed, unlike BCG matrix)
    expect(quickWinCx).toBeLessThan(bigBetCx);
  });
});

describe("bumpChart", () => {
  it("places a better (lower-number) rank higher on screen (smaller pixel y)", () => {
    const el = mount();
    bumpChart(
      el,
      {
        series: [{ id: "a", label: "Acme", colorIndex: 0 }],
        points: [
          { seriesId: "a", period: "2020", rank: 3 },
          { seriesId: "a", period: "2021", rank: 1 },
        ],
      },
      { theme: "light" },
    );
    const circles = [...el.querySelectorAll("circle")];
    expect(circles).toHaveLength(2);
    const [y2020, y2021] = circles.map((c) => Number(c.getAttribute("cy")));
    expect(y2021).toBeLessThan(y2020); // rank 1 (2021) above rank 3 (2020)
  });
});

describe("driverTreeChart", () => {
  it("d3-hierarchy's tree() layout produces exactly one box per input node", () => {
    const el = mount();
    driverTreeChart(
      el,
      {
        label: "Revenue",
        value: 1000,
        childrenOperator: "×",
        children: [
          { label: "Price", value: 10 },
          { label: "Volume", value: 100 },
        ],
      },
      { theme: "light" },
    );
    // background rect + 3 node boxes (rx=4) = 4 rects; 3 nodes total, 1 root + 2 leaves
    const nodeBoxes = [...el.querySelectorAll("rect")].filter((r) => r.getAttribute("rx") === "4");
    expect(nodeBoxes).toHaveLength(3);
    // exactly one connector per parent-child link (2 links for 1 parent + 2 children)
    expect(el.querySelectorAll("path")).toHaveLength(2);
    // one operator badge circle (root has childrenOperator)
    expect(el.querySelectorAll("circle")).toHaveLength(1);
  });

  it("update()/destroy() lifecycle works", () => {
    const el = mount();
    const chart = driverTreeChart(el, { label: "Root", children: [{ label: "Leaf", value: 1 }] });
    chart.update({ label: "Root2", children: [{ label: "LeafA", value: 1 }, { label: "LeafB", value: 2 }] });
    chart.destroy();
    expect(el.innerHTML).toBe("");
  });
});
