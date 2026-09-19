import { recommendAndRender, type Rendered, type Row } from "../src/index.js";

/** Sample datasets for the recommender card. Each exercises a different answer. */
const month = (y: number, m: number) => new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
const SAMPLES: Record<string, Row[]> = {
  "Revenue by region (concentrated)": [["North", 500], ["South", 300], ["East", 60], ["West", 40], ["Central", 30], ["Islands", 25], ["Coast", 20], ["Hills", 15], ["Desert", 10]].map(
    ([region, revenue]) => ({ region, revenue: `$${revenue}` }),
  ),
  "Monthly revenue, 3 years (seasonal)": Array.from({ length: 36 }, (_, i) => ({
    month: month(2022 + Math.floor(i / 12), i % 12),
    revenue: Math.round(100 + i * 2 + 30 * Math.sin((2 * Math.PI * i) / 12)),
  })),
  "Team scores by month (rank change)": Array.from({ length: 8 }, (_, i) =>
    [["Ada", 30 + i * 6], ["Bo", 45 - (i % 3) * 2], ["Cy", 52 - i * 4]].map(([team, score]) => ({ month: month(2024, i), team, score })),
  ).flat(),
  "Valuation ranges with base case": [
    { method: "DCF", low: 41, high: 58, base: 50 },
    { method: "Trading comps", low: 45, high: 53, base: 49 },
    { method: "Precedent deals", low: 49, high: 64, base: 57 },
    { method: "52-week range", low: 36, high: 51, base: 44 },
  ],
  "KPIs against targets": [
    { metric: "Revenue $M", actual: 71, target: 80 },
    { metric: "Gross margin %", actual: 38, target: 50 },
    { metric: "NPS", actual: 60, target: 55 },
    { metric: "Retention %", actual: 91, target: 90 },
  ],
  "Five flat numbers (table, not a chart)": ["a", "b", "c", "d", "e"].map((k, i) => ({ k, v: 100 + (i % 2) })),
  "Two values (a number)": [{ team: "A", score: 10 }, { team: "B", score: 14 }],
  "Spend vs sales (chart not built yet)": Array.from({ length: 30 }, (_, i) => ({ spend: i * 3.3, sales: 2 * i * 3.3 + ((i * 7) % 11) })),
};

/** Wire up the recommender card. Returns a function to call when the theme changes. */
export function mountRecommender(host: HTMLElement, getMode: () => "light" | "dark"): () => void {
  const select = document.createElement("select");
  select.style.cssText = "font:inherit;padding:6px;margin:0 8px 12px 0";
  for (const name of Object.keys(SAMPLES)) select.appendChild(new Option(name, name));
  const purpose = document.createElement("select");
  purpose.style.cssText = select.style.cssText;
  for (const p of ["explain", "explore", "monitor", "persuade", "reference"]) purpose.appendChild(new Option(`purpose: ${p}`, p));
  const audience = document.createElement("select");
  audience.style.cssText = select.style.cssText;
  for (const a of ["expert", "self", "executive", "public"]) audience.appendChild(new Option(`audience: ${a}`, a));
  const paste = document.createElement("textarea");
  paste.placeholder = "…or paste your own rows as a JSON array of objects";
  paste.style.cssText = "display:block;width:100%;box-sizing:border-box;height:56px;margin-bottom:12px;font:12px ui-monospace,monospace";
  const stage = document.createElement("div");
  stage.style.cssText = "max-width:640px";
  const detail = document.createElement("pre");
  detail.style.cssText = "white-space:pre-wrap;font:12px ui-monospace,monospace;margin:16px 0 0;padding:12px;border-radius:6px;background:rgba(127,127,127,0.10)";
  host.append(select, purpose, audience, paste, stage, detail);

  let current: Rendered | undefined;
  const render = () => {
    current?.destroy();
    let rows: Row[] = SAMPLES[select.value];
    if (paste.value.trim()) {
      try {
        const parsed = JSON.parse(paste.value);
        if (Array.isArray(parsed)) rows = parsed;
      } catch {
        detail.textContent = "The pasted text is not valid JSON; showing the selected sample instead.";
      }
    }
    current = recommendAndRender(stage, rows, { purpose: purpose.value as never, audience: audience.value as never }, { theme: getMode() });
    const r = current.recommendation;
    detail.textContent = [
      `answer: ${r.answer}${r.needed ? ` (needs: ${r.needed})` : ""}   view: ${r.view.id}`,
      `insight: ${r.insight.type}`,
      r.chart ? `chart: ${r.chart.chart} (${r.chart.score})\n  ${r.chart.reasons.join("\n  ")}` : "chart: none",
      `alternatives: ${r.alternatives.map((a) => `${a.chart}${a.built ? "" : " (not built)"} ${a.score}`).join(", ") || "-"}`,
      `rejected: ${r.rejected.map((x) => `${x.chart} (${x.because})`).join("; ") || "-"}`,
      `gaps: ${r.gaps.join("; ") || "-"}`,
      `ask: ${r.questionsForUser.join(" | ")}`,
    ].join("\n");
  };
  for (const c of [select, purpose, audience]) c.addEventListener("change", render);
  paste.addEventListener("input", render);
  render();
  return render;
}
