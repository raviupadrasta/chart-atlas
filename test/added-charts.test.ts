import { describe, expect, it } from "vitest";
import { seasonalOverlayChart } from "../src/charts/seasonal-overlay.js";
import { radialBadgeBarChart } from "../src/charts/radial-badge-bar.js";
import { THEMES } from "../src/theme/tokens.js";

function mount(): HTMLDivElement {
  const div = document.createElement("div");
  document.body.appendChild(div);
  return div;
}

describe("seasonalOverlayChart", () => {
  it("computes best/worst/median from the data and ranks the current series among them", () => {
    const el = mount();
    // 5 series, all measured at the same index (4) as "current"'s last point.
    // Values at index 4: current=95, A=120 (best), B=80 (worst), C=100, D=105.
    // others sorted ascending by value: B(80), C(100), D(105), A(120) -> median = index floor(4/2)=2 -> D.
    // rank: others > 95 are A, C, D (3 of them) -> rank 1+3 = 4 of 5.
    seasonalOverlayChart(
      el,
      [
        { label: "2026", points: [100, 98, 97, 96, 95], emphasis: "current" },
        { label: "A", points: [100, 105, 110, 115, 120] },
        { label: "B", points: [100, 90, 85, 82, 80] },
        { label: "C", points: [100, 100, 100, 100, 100] },
        { label: "D", points: [100, 102, 103, 104, 105] },
      ],
      { theme: "light" },
    );
    const texts = [...el.querySelectorAll("text")].map((t) => t.textContent ?? "");
    expect(texts.some((t) => t.includes("Current: -5.0 (Rank 4/5)"))).toBe(true);
    expect(texts.some((t) => t.includes("Best: +20.0 (A)"))).toBe(true);
    expect(texts.some((t) => t.includes("Worst: -20.0 (B)"))).toBe(true);
    // 5 paths (one per series) + emphasized end-labels for current, best, worst, median (D) = 4 label texts
    expect(el.querySelectorAll("path")).toHaveLength(5);
    expect(texts.filter((t) => t === "D").length).toBeGreaterThan(0); // median series gets a direct end-label
  });

  it("falls back to a plain full-cycle comparison when no series is marked current", () => {
    const el = mount();
    seasonalOverlayChart(
      el,
      [
        { label: "A", points: [100, 110, 120] },
        { label: "B", points: [100, 95, 90] },
        { label: "C", points: [100, 100, 100] },
      ],
      { theme: "light" },
    );
    const texts = [...el.querySelectorAll("text")].map((t) => t.textContent ?? "");
    expect(texts.some((t) => t.startsWith("Current:"))).toBe(false);
    expect(texts.some((t) => t.includes("Best: +20.0 (A)"))).toBe(true);
    expect(texts.some((t) => t.includes("Worst: -10.0 (B)"))).toBe(true);
  });

  it("update()/destroy() lifecycle works", () => {
    const el = mount();
    const chart = seasonalOverlayChart(el, [
      { label: "A", points: [100, 101] },
      { label: "B", points: [100, 99] },
    ]);
    chart.update([
      { label: "A", points: [100, 105, 110] },
      { label: "B", points: [100, 95, 90] },
    ]);
    chart.destroy();
    expect(el.innerHTML).toBe("");
  });
});

describe("radialBadgeBarChart", () => {
  it("renders a track ring for every row but only an arc for rows with duration > 0", () => {
    const el = mount();
    radialBadgeBarChart(
      el,
      [
        { label: "Long-running", magnitude: -5, duration: 700 },
        { label: "At peak", magnitude: 0, duration: 0 },
      ],
      { theme: "light" },
    );
    // 2 track circles (one per row), always rendered regardless of duration
    expect(el.querySelectorAll("circle")).toHaveLength(2);
    // only 1 arc path (the zero-duration row must not produce a degenerate/empty arc attempt)
    expect(el.querySelectorAll("path")).toHaveLength(1);
  });

  it("the largest duration in the set produces a large-arc-flagged sweep, a small one does not", () => {
    const el = mount();
    radialBadgeBarChart(
      el,
      [
        { label: "Max", magnitude: -1, duration: 100 }, // sweep ~349.2deg -> large-arc flag = 1
        { label: "Small", magnitude: -1, duration: 10 }, // sweep 36deg -> large-arc flag = 0
      ],
      { theme: "light" },
    );
    const arcs = [...el.querySelectorAll("path")];
    expect(arcs).toHaveLength(2);
    // donutSegmentPath's arc commands read "A{r},{r} 0 {largeFlag} 1 ..." — the large-arc flag
    // is the number immediately before the sweep flag on the first (outer) arc command.
    const largeFlagOf = (d: string) => d.match(/A[\d.]+,[\d.]+ 0 (\d) 1/)?.[1];
    expect(largeFlagOf(arcs[0].getAttribute("d")!)).toBe("1");
    expect(largeFlagOf(arcs[1].getAttribute("d")!)).toBe("0");
  });

  it("colors bars by severity bucket relative to the largest magnitude in the set, good at zero", () => {
    const el = mount();
    radialBadgeBarChart(
      el,
      [
        { label: "At peak", magnitude: 0, duration: 0 },
        { label: "Deepest", magnitude: -10, duration: 50 },
      ],
      { theme: "light" },
    );
    const texts = [...el.querySelectorAll("text")];
    const zeroLabel = texts.find((t) => t.textContent === "0.00%");
    expect(zeroLabel?.getAttribute("fill")).toBe(THEMES.light.status.good);
    const rects = [...el.querySelectorAll("rect")].filter((r) => r.getAttribute("fill") !== THEMES.light.surface);
    expect(rects).toHaveLength(1); // only the non-zero row gets a bar
    expect(rects[0].getAttribute("fill")).toBe(THEMES.light.status.critical);
  });

  it("update()/destroy() lifecycle works", () => {
    const el = mount();
    const chart = radialBadgeBarChart(el, [{ label: "A", magnitude: -3, duration: 10 }]);
    chart.update([{ label: "B", magnitude: -6, duration: 40 }]);
    chart.destroy();
    expect(el.innerHTML).toBe("");
  });
});
