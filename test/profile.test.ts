import { describe, expect, it } from "vitest";
import { profileColumn, profileDataset } from "../src/profile/index.js";

const col = (name: string, values: unknown[]) => profileColumn(name, values);

describe("profileColumn: roles", () => {
  it("continuous quantitative", () => {
    const c = col("height", [1.5, 2.25, 3.1, 4.8, 10.2]);
    expect(c.role).toBe("quantitative");
    expect(c.subtype).toBe("continuous");
    expect(c.numeric).toMatchObject({ min: 1.5, max: 10.2, nonNegative: true, allPositive: true });
  });

  it("non-negative integers are counts", () => {
    const c = col("orders", [3, 8, 120, 45, 9, 0, 17]);
    expect(c.role).toBe("quantitative");
    expect(c.subtype).toBe("count");
  });

  it("currency strings parse and are not counts", () => {
    const c = col("amount", ["$1,200", "$950", "$3,400", "$75"]);
    expect(c.role).toBe("quantitative");
    expect(c.unit).toBe("currency");
    expect(c.subtype).toBe("continuous");
    expect(c.numeric?.max).toBe(3400);
  });

  it("counts and currency are additive, but scores, rates and prices are not", () => {
    expect(col("orders", [3, 8, 120, 45, 9, 0, 17]).additive).toBe(true);
    expect(col("revenue", ["$1,200", "$950", "$3,400"]).additive).toBe(true);
    expect(col("score", [30, 40, 50, 36, 44, 52]).additive).toBe(false);
    expect(col("unit_price", ["$12", "$9", "$30"]).additive).toBe(false);
    expect(col("height", [1.5, 2.25, 3.1]).additive).toBe(false);
    expect(col("region", ["a", "b"]).additive).toBe(false);
  });

  it("percent strings are proportions with a percent unit", () => {
    const c = col("churn", ["12%", "45%", "8.5%", "30%"]);
    expect(c.subtype).toBe("proportion");
    expect(c.unit).toBe("percent");
  });

  it("fractions in [0,1] are proportions", () => {
    const c = col("conversion", [0.12, 0.45, 0.085, 0.3]);
    expect(c.subtype).toBe("proportion");
  });

  it("0-100 values in a column named like a percentage are proportions", () => {
    const c = col("margin_pct", [12, 45, 8, 30, 61]);
    expect(c.subtype).toBe("proportion");
    expect(c.unit).toBe("percent");
  });

  it("an integer year column is temporal with yearly granularity", () => {
    const c = col("year", [2019, 2020, 2021, 2022, 2023]);
    expect(c.role).toBe("temporal");
    expect(c.temporal?.granularity).toBe("year");
    expect(c.temporal?.regularity).toBe(1);
  });

  it("daily ISO dates are temporal, regular, day granularity", () => {
    const days = Array.from({ length: 10 }, (_, i) => `2024-03-${String(i + 1).padStart(2, "0")}`);
    const c = col("date", days);
    expect(c.role).toBe("temporal");
    expect(c.temporal).toMatchObject({ granularity: "day", regularity: 1, spanDays: 9 });
  });

  it("monthly and quarterly ISO dates", () => {
    const monthly = col("month", ["2024-01-01", "2024-02-01", "2024-03-01", "2024-04-01", "2024-05-01"]);
    expect(monthly.temporal?.granularity).toBe("month");
    const quarterly = col("q", ["2024-01-01", "2024-04-01", "2024-07-01", "2024-10-01"]);
    expect(quarterly.temporal?.granularity).toBe("quarter");
  });

  it("year-month strings (YYYY-MM) are temporal", () => {
    expect(col("period", ["2024-01", "2024-02", "2024-03"]).role).toBe("temporal");
  });

  it("Date objects are temporal", () => {
    const c = col("when", [new Date("2024-01-01"), new Date("2024-01-02"), new Date("2024-01-03")]);
    expect(c.role).toBe("temporal");
  });

  it("unevenly spaced dates are irregular", () => {
    const c = col("date", ["2024-01-01", "2024-01-04", "2024-02-20", "2024-06-01"]);
    expect(c.temporal?.granularity).toBe("irregular");
  });

  it("unique integers in a column named like an id are ids", () => {
    const c = col("customer_id", [101, 102, 103, 104]);
    expect(c.role).toBe("id");
    expect(col("userId", ["a1", "a2", "a3"]).role).toBe("id");
  });

  it("a unique string column that is not named like an id stays nominal (category labels are usually unique)", () => {
    const c = col("region", ["North", "South", "East", "West"]);
    expect(c.role).toBe("nominal");
    expect(c.cardinality).toBe("unique");
  });

  it("known ordered vocabularies become ordinal, in their natural order", () => {
    const m = col("month", ["Mar", "Jan", "Feb", "Jan", "Mar"]);
    expect(m.role).toBe("ordinal");
    expect(m.order).toEqual(["Jan", "Feb", "Mar"]);
    const s = col("risk", ["high", "low", "medium", "low"]);
    expect(s.order).toEqual(["low", "medium", "high"]);
  });

  it("a small integer scale with many rows is ordinal", () => {
    const ratings = [5, 4, 3, 5, 4, 4, 2, 5, 3, 4, 1, 5, 4, 3, 4, 5, 2, 4, 5, 3];
    const c = col("rating", ratings);
    expect(c.role).toBe("ordinal");
    expect(c.order).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("a constant integer column (e.g. the same target on every row) stays quantitative, not an ordinal scale", () => {
    const c = col("target", [55, 55, 55, 55, 55, 55]);
    expect(c.role).toBe("quantitative");
  });

  it("a small integer column named like a count stays quantitative", () => {
    const c = col("order_count", [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3]);
    expect(c.role).toBe("quantitative");
  });

  it("boolean-like columns are nominal", () => {
    expect(col("active", [true, false, true]).notes).toContain("boolean-like values");
    expect(col("paid", ["yes", "no", "yes"]).role).toBe("nominal");
  });

  it("mostly-numeric text with too many non-numbers is treated as categories", () => {
    const c = col("label", ["12", "abc", "x9", "44", "zz"]);
    expect(c.role).toBe("nominal");
    expect(c.notes.join(" ")).toMatch(/look numeric/);
  });

  it("a column that is entirely missing is empty", () => {
    expect(col("x", [null, undefined, "", "NA"]).role).toBe("empty");
  });
});

describe("profileColumn: missing values and stats", () => {
  it("counts missing tokens and reports the share", () => {
    const c = col("v", [1, 2, null, "NA", "", 5]);
    expect(c.count).toBe(3);
    expect(c.missing).toBe(3);
    expect(c.missingShare).toBe(0.5);
  });

  it("flags a log-worthy spread, skew and outliers", () => {
    const c = col("income", [20, 25, 30, 32, 35, 40, 48, 60, 90, 5000]);
    expect(c.numeric?.spansOrders).toBe(true);
    expect(c.numeric?.skew).toBeGreaterThan(1);
    expect(c.numeric?.outlierCount).toBeGreaterThanOrEqual(1);
  });

  it("flags sign change and non-negativity", () => {
    expect(col("delta", [-5, 3, 10, -2]).numeric?.hasSignChange).toBe(true);
    expect(col("delta", [1, 3, 10]).numeric?.hasSignChange).toBe(false);
    expect(col("delta", [-5, -3]).numeric?.nonNegative).toBe(false);
  });

  it("classifies cardinality", () => {
    expect(col("a", ["x", "y", "x", "y", "x"]).cardinality).toBe("low");
    expect(col("a", Array.from({ length: 30 }, (_, i) => `k${i % 12}`)).cardinality).toBe("medium");
    expect(col("a", Array.from({ length: 60 }, (_, i) => `k${i % 40}`)).cardinality).toBe("high");
  });

  it("lists the most frequent categories", () => {
    const c = col("team", ["a", "b", "a", "c", "a", "b"]);
    expect(c.topValues?.[0]).toEqual({ value: "a", count: 3 });
  });
});

describe("profileDataset", () => {
  it("takes the union of keys and treats absent keys as missing", () => {
    const p = profileDataset([{ a: 1, b: "x" }, { a: 2 }, { a: 3, c: 9 }]);
    expect(p.columns.map((c) => c.name)).toEqual(["a", "b", "c"]);
    expect(p.columns[1].missing).toBe(2);
    expect(p.rowCount).toBe(3);
    expect(p.columnCount).toBe(3);
  });

  it("returns JSON-safe data (survives a round trip unchanged)", () => {
    const p = profileDataset([
      { day: "2024-01-01", region: "N", sales: "$1,200", share: "10%" },
      { day: "2024-01-02", region: "S", sales: "$900", share: "5%" },
      { day: "2024-01-03", region: "N", sales: "$1,500", share: "15%" },
    ]);
    expect(JSON.parse(JSON.stringify(p))).toEqual(p);
  });

  it("handles an empty dataset", () => {
    expect(profileDataset([])).toEqual({ rowCount: 0, columnCount: 0, columns: [], views: [] });
  });
});
