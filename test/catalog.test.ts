import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOG, PLANNED_CATALOG, PLANNED_CHARTS } from "../src/catalog/index.js";

const chartFiles = readdirSync(resolve(process.cwd(), "src/charts"))
  .filter((f) => f.endsWith(".ts"))
  .map((f) => f.replace(/\.ts$/, ""));
const indexSrc = readFileSync(resolve(process.cwd(), "src/index.ts"), "utf8");

describe("catalog", () => {
  it("has exactly one entry per chart file, and no orphans", () => {
    const ids = CATALOG.map((e) => e.id).sort();
    expect(ids).toEqual([...chartFiles].sort());
  });

  it("has unique ids", () => {
    const ids = CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(CATALOG.map((e) => [e.id, e] as const))("%s: factory and data type are exported", (_id, e) => {
    expect(indexSrc).toMatch(new RegExp(`export \\{[^}]*\\b${e.factory}\\b`));
    expect(indexSrc).toMatch(new RegExp(`\\b${e.dataType}\\b`));
  });

  it.each(CATALOG.map((e) => [e.id, e] as const))("%s: is fully described", (_id, e) => {
    expect(e.insightTypes.length).toBeGreaterThan(0);
    expect(e.questions.length).toBeGreaterThan(0);
    expect(e.whenNotToUse.length).toBeGreaterThan(0);
    expect(e.principles.length).toBeGreaterThan(0);
    expect(e.requires.minRows).toBeGreaterThanOrEqual(1);
  });

  it("only references alternatives that exist or are planned", () => {
    const known = new Set<string>([...CATALOG.map((e) => e.id), ...PLANNED_CHARTS]);
    for (const e of CATALOG) {
      for (const alt of e.alternatives) expect(known.has(alt), `${e.id} -> ${alt}`).toBe(true);
    }
  });

  it("marks built entries built and planned entries planned, with no overlap", () => {
    for (const e of CATALOG) expect(e.status, e.id).toBe("built");
    for (const e of PLANNED_CATALOG) {
      expect(e.status, e.id).toBe("planned");
      expect(PLANNED_CHARTS as readonly string[], e.id).toContain(e.id);
    }
    const built = new Set(CATALOG.map((e) => e.id));
    for (const e of PLANNED_CATALOG) expect(built.has(e.id), `${e.id} is both built and planned`).toBe(false);
  });

  it("planned entries are fully described and reference known charts", () => {
    const known = new Set<string>([...CATALOG.map((e) => e.id), ...PLANNED_CHARTS]);
    for (const e of PLANNED_CATALOG) {
      expect(e.insightTypes.length, e.id).toBeGreaterThan(0);
      expect(e.whenNotToUse.length, e.id).toBeGreaterThan(0);
      for (const alt of e.alternatives) expect(known.has(alt), `${e.id} -> ${alt}`).toBe(true);
    }
  });
});
