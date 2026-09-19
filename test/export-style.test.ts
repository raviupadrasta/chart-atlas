import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TARGETS, emit, toSpec } from "../src/export/index.js";
import { STYLE } from "../src/export/style.js";
import type { Mapped } from "../src/recommend/map.js";
import { THEMES } from "../src/theme/tokens.js";

const dir = join(process.cwd(), "src/export");
const emitters = readdirSync(dir).filter((f) => f.endsWith(".ts") && f !== "style.ts");

describe("export style: one source of truth", () => {
  for (const file of emitters) {
    it(`${file} has no hex colour or font-family literal of its own`, () => {
      const src = readFileSync(join(dir, file), "utf8");
      expect(src.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? []).toEqual([]);
      expect(src).not.toMatch(/font-?family\s*[:=]\s*["'`][^"'`]+["'`]/i);
      expect(src).not.toMatch(/Helvetica|Arial|DejaVu|system-ui/);
    });
  }

  const note = { id: "n", severity: "info" as const, rule: "R13", text: "A note." };
  const m = (chart: string, data: unknown, options: Record<string, unknown> = {}): Mapped => ({ chart, data, options, notes: [note] });
  const tornado = toSpec(m("tornado", [{ label: "Price", low: 60, high: 140, base: 100 }, { label: "Cost", low: 80, high: 115, base: 100 }]))!;
  const bump = toSpec(m("bump", { series: [{ id: "A", label: "A", colorIndex: 0 }, { id: "B", label: "B", colorIndex: 1 }], points: ["Jan", "Feb"].flatMap((p, i) => [{ seriesId: "A", period: p, rank: i + 1 }, { seriesId: "B", period: p, rank: 2 - i }]) }))!;
  const allowed = new Set([...Object.values(STYLE.color.tone), ...STYLE.color.series, STYLE.color.ink, STYLE.color.inkSecondary, STYLE.color.grid, STYLE.color.surface].map((c) => c.toLowerCase()));

  for (const target of TARGETS) {
    it(`${target}: every colour comes from the shared palette and the font is the shared one`, () => {
      for (const spec of [tornado, bump]) {
        const text = JSON.stringify(emit(spec, target).body);
        const hexes = (text.match(/#[0-9a-fA-F]{6}\b/g) ?? []).map((h) => h.toLowerCase());
        expect(hexes.length).toBeGreaterThan(0);
        for (const h of hexes) expect(allowed.has(h)).toBe(true);
        const python = target === "matplotlib" || target === "seaborn" || target === "plotly";
        expect(text).toContain(python ? STYLE.font.familyPython[0] : target === "observable-plot" || target === "echarts" || target === "vega-lite" ? "system-ui" : "");
      }
    });
  }

  it("every target draws the same outer size", () => {
    expect(tornado.size.width).toBe(STYLE.space.width);
    expect(bump.size).toEqual({ width: STYLE.space.width, height: STYLE.space.plotHeight });
  });

  it("the shared palette is the atlas light theme", () => {
    expect(STYLE.color.series).toEqual(THEMES.light.categorical.slice(0, 8));
    expect(STYLE.color.tone.bandLight).toBe(THEMES.light.neutral.bandLight);
  });
});
