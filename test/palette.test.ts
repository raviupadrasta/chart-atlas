import { describe, expect, it } from "vitest";
// @ts-expect-error — plain-JS validator script, ported verbatim from the dataviz skill; no .d.ts.
import { validate } from "../scripts/validate_palette.js";
import { THEMES } from "../src/theme/tokens.js";

/**
 * The whole premise of this library is one coherent, computably-safe color
 * system. If someone edits src/theme/tokens.ts to rebrand — swaps in a new
 * categorical palette without re-running the checks — this test is what
 * fails CI instead of a WARN buried in a doc nobody reads.
 */
describe("categorical palette", () => {
  it("passes the six-check validator in light mode", () => {
    const { report, ok } = validate(THEMES.light.categorical, {
      mode: "light",
      surface: THEMES.light.surface,
    });
    expect(ok, JSON.stringify(report, null, 2)).toBe(true);
  });

  it("passes the six-check validator in dark mode", () => {
    const { report, ok } = validate(THEMES.dark.categorical, {
      mode: "dark",
      surface: THEMES.dark.surface,
    });
    expect(ok, JSON.stringify(report, null, 2)).toBe(true);
  });

  it("passes the stricter all-pairs check for the first three slots (scatter/bubble/choropleth cap)", () => {
    const capped = THEMES.light.categorical.slice(0, 3);
    const { report, ok } = validate(capped, {
      mode: "light",
      surface: THEMES.light.surface,
      pairs: "all",
    });
    expect(ok, JSON.stringify(report, null, 2)).toBe(true);
  });
});
