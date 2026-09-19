import { CATALOG, PLANNED_CATALOG } from "../catalog/index.js";
import type { CatalogEntry, Encoding, Familiarity } from "../catalog/types.js";
import type { Caveat, ColumnProfile, DatasetProfile, View } from "../profile/types.js";
import { insightsFor, statementFor, type InsightOption } from "./insights.js";
import { FED_BY } from "./map.js";
import type { Candidate, Context, Recommendation, Rejection, ResolvedContext } from "./types.js";

/**
 * Rule tiers (docs/insight-taxonomy.md, section 11.2):
 *  - Integrity: hard filter. A chart whose data requirements are not met is rejected.
 *  - Default: guidance that scores down and is stated as an override when the chart is still chosen.
 *  - Taste: tie-breaker only (the attractiveness axis).
 */

const DEFAULT_CONTEXT: ResolvedContext = { purpose: "explain", audience: "expert", medium: "report", forceChart: false };
const ENCODING: Record<Encoding, number> = { position: 1, length: 0.9, angle: 0.6, area: 0.5, color: 0.3 };
const ORDER_SCORE = [1, 0.75, 0.55, 0.4];
const SOUNDNESS: Record<Familiarity, Record<ResolvedContext["audience"], number>> = {
  conventional: { self: 1, expert: 1, executive: 1, public: 1 },
  specialist: { self: 0.9, expert: 0.85, executive: 0.65, public: 0.5 },
  novel: { self: 0.7, expert: 0.55, executive: 0.4, public: 0.3 },
};
const ATTRACTIVE: Record<Familiarity, number> = { conventional: 0.5, specialist: 0.6, novel: 0.7 };
/** Above this multiple of a chart's maxRows the guidance is treated as a hard limit. */
const HARD_ROW_LIMIT = 1.5;
/** A planned chart must beat the best built one by this much (0-100 scale) to be reported as a gap. */
const GAP_MARGIN = 3;
/** Score taken off a chart when an acceptable alternative encodes the same insight by a clearly stronger channel (R1). */
const ENCODING_PENALTY = 8;
const r1 = (x: number) => Number(x.toFixed(1));

export function resolveContext(ctx: Context = {}): ResolvedContext {
  return {
    purpose: ctx.purpose ?? DEFAULT_CONTEXT.purpose,
    audience: ctx.audience ?? DEFAULT_CONTEXT.audience,
    medium: ctx.medium ?? DEFAULT_CONTEXT.medium,
    forceChart: ctx.forceChart ?? false,
  };
}

/** Columns a view reads numbers from; used to check sign requirements. */
function measureColumns(view: View, cols: Map<string, ColumnProfile>): ColumnProfile[] {
  const names = [view.columns.measure, view.columns.x, view.columns.y, view.columns.actual, view.columns.low, view.columns.high];
  return names.filter((n): n is string => !!n).map((n) => cols.get(n)).filter((c): c is ColumnProfile => !!c);
}

type Verdict = { ok: true; fit: number; overrides: string[] } | { ok: false; because: string; rule?: string };

/** Integrity and Default checks for one (chart, view) pair. */
function check(entry: CatalogEntry, view: View, cols: Map<string, ColumnProfile>): Verdict {
  const have = new Set(view.structure);
  const missing = entry.requires.structure.filter((f) => !have.has(f));
  if (missing.length) return { ok: false, because: `needs ${missing.join(" and ")}, which this data does not show`, rule: "R11" };
  if (entry.status === "built" && !FED_BY[entry.id]?.includes(view.kind)) {
    return { ok: false, because: `chart-atlas cannot yet build this chart's data from a "${view.kind}" view`, rule: "R11" };
  }
  if (entry.requires.nonNegative && measureColumns(view, cols).some((c) => c.numeric && !c.numeric.nonNegative)) {
    return { ok: false, because: "has negative values, which this chart cannot show", rule: "R15" };
  }
  const { minRows, maxRows } = entry.requires;
  if (view.n < minRows) return { ok: false, because: `${view.n} values is fewer than the ${minRows} it needs`, rule: "R11" };
  const overrides: string[] = [];
  let fit = 1;
  if (maxRows && view.n > maxRows) {
    if (view.n > maxRows * HARD_ROW_LIMIT) return { ok: false, because: `${view.n} values is far past its limit of about ${maxRows}`, rule: "R11" };
    fit = Math.max(0.5, 1 - (0.5 * (view.n - maxRows)) / maxRows);
    overrides.push(`${view.n} values is past the usual limit of about ${maxRows} for this chart`);
  }
  return { ok: true, fit, overrides };
}

function score(entry: CatalogEntry, insight: InsightOption, view: View, ctx: ResolvedContext, fit: number, overrides: string[]): Candidate {
  const orderIdx = entry.insightTypes.indexOf(insight.type);
  const order = ORDER_SCORE[Math.min(orderIdx, ORDER_SCORE.length - 1)];
  const enc = ENCODING[entry.primaryEncoding];
  const accurate = ctx.purpose === "monitor" || ctx.purpose === "reference" || ctx.purpose === "explore";
  const encAdj = accurate ? enc : 0.5 + 0.5 * enc;
  const purposeMatch = entry.purposes.includes(ctx.purpose) ? 1 : 0.6;
  const utility = insight.weight * (0.45 * order + 0.3 * encAdj + 0.25 * purposeMatch);
  const soundness = SOUNDNESS[entry.familiarity][ctx.audience];
  const attractiveness = ATTRACTIVE[entry.familiarity];
  const total = 100 * fit * (0.55 * utility + 0.35 * soundness + 0.1 * attractiveness);
  const reasons = [
    `serves "${insight.type}"${orderIdx === 0 ? " (its main use)" : " (one of its uses)"}`,
    `${entry.primaryEncoding} encoding${accurate ? ", which matters for accurate reading here" : ""}`,
    entry.purposes.includes(ctx.purpose) ? `suits the "${ctx.purpose}" purpose` : `not usually chosen for "${ctx.purpose}"`,
    `${entry.familiarity} form for ${/^[aeiou]/.test(ctx.audience) ? "an" : "a"} ${ctx.audience} audience`,
  ];
  void view;
  return {
    chart: entry.id,
    title: entry.title,
    built: entry.status === "built",
    ...(entry.factory ? { factory: entry.factory } : {}),
    insight: insight.type,
    score: r1(total),
    parts: { utility: r1(utility * 100) / 100, soundness: r1(soundness * 100) / 100, attractiveness, fit: r1(fit * 100) / 100 },
    reasons,
    overrides,
  };
}

function questionsFor(view: View, ctx: Context | undefined): string[] {
  const q: string[] = [];
  const what = view.columns.measure ?? view.columns.actual ?? view.columns.y ?? "these values";
  q.push(`How was ${what} measured, and by whom? (provenance changes how far to trust the chart)`);
  if (view.caveats.some((c) => c.id === "aggregated" || c.id === "mean-of-rows")) {
    q.push("Are the rows independent observations, or several rows per person, place or day?");
  }
  if (!ctx || (!ctx.purpose && !ctx.audience && !ctx.medium)) {
    q.push("Assumed you want to explain this to an expert reader in a report. Is that right?");
  }
  return q.slice(0, 3);
}

function recommendView(view: View, cols: Map<string, ColumnProfile>, rawCtx: Context | undefined): Recommendation {
  const ctx = resolveContext(rawCtx);
  const insights = insightsFor(view);
  const accepted: Candidate[] = [];
  const rejected: Rejection[] = [];
  const seenRejected = new Set<string>();

  for (const entry of [...CATALOG, ...PLANNED_CATALOG]) {
    const options = insights.filter((i) => entry.insightTypes.includes(i.type));
    if (options.length === 0) continue;
    const verdict = check(entry, view, cols);
    if (!verdict.ok) {
      if (!seenRejected.has(entry.id)) {
        seenRejected.add(entry.id);
        rejected.push({ chart: entry.id, because: verdict.because, ...(verdict.rule ? { rule: verdict.rule } : {}) });
      }
      continue;
    }
    // Score the chart for its best-matching insight only.
    const best = options
      .map((o) => score(entry, o, view, ctx, verdict.fit, verdict.overrides))
      .sort((a, b) => b.score - a.score)[0];
    accepted.push(best);
  }
  // R1 (Default tier): prefer position/length over angle/area for the key comparison. A chart loses points
  // when another acceptable chart, for an insight of similar weight, uses a clearly stronger channel.
  const enc = new Map([...CATALOG, ...PLANNED_CATALOG].map((e) => [e.id, ENCODING[e.primaryEncoding]]));
  const weight = new Map(insights.map((i) => [i.type, i.weight]));
  for (const c of accepted) {
    const mine = enc.get(c.chart) ?? 0;
    const stronger = accepted.find((o) => o !== c && (enc.get(o.chart) ?? 0) - mine >= 0.3 && (weight.get(o.insight) ?? 0) >= 0.7);
    if (stronger) {
      c.score = r1(c.score - ENCODING_PENALTY);
      c.reasons.push(`loses points (R1): ${stronger.title.toLowerCase()} shows the same thing with a stronger encoding`);
    }
  }
  accepted.sort((a, b) => b.score - a.score || (a.chart < b.chart ? -1 : 1));

  const built = accepted.filter((c) => c.built);
  const topBuilt = built[0];
  const topAny = accepted[0];
  const gaps = accepted
    .filter((c) => !c.built && (!topBuilt || c.score >= topBuilt.score + GAP_MARGIN))
    .map((c) => `${c.chart}: would be the better choice but is not built yet`);

  const caveats: Caveat[] = [...view.caveats];
  const chosen = topBuilt ? CATALOG.find((e) => e.id === topBuilt.chart) : undefined;
  for (const issue of chosen?.knownIssues ?? []) caveats.push({ id: `known-issue:${chosen!.id}`, severity: "info", rule: "R34", text: issue });
  for (const o of topBuilt?.overrides ?? []) caveats.push({ id: "guidance-override", severity: "info", rule: "R11", text: o });

  const insightType = (topBuilt ?? topAny)?.insight ?? insights[0].type;
  let answer: Recommendation["answer"] = "chart";
  let reason: string | undefined;
  let needed: string | undefined;

  if (!ctx.forceChart && view.n === 2) {
    answer = "number";
    reason = "Two values are a comparison, not a pattern: state both numbers and their difference (a chart adds nothing).";
  } else if (!ctx.forceChart && view.caveats.some((c) => c.id === "few-values")) {
    answer = "table";
    reason = `Only ${view.n} values and no strong pattern: a table shows them more precisely than a chart (data-ink, and tables serve small data sets best).`;
  } else if (!topBuilt) {
    answer = "baseline-needed";
    needed = topAny?.chart;
    reason = topAny
      ? `No built chart fits; the right one is a ${topAny.title.toLowerCase()}, which chart-atlas does not have yet.`
      : "No chart in the catalog fits this data.";
  }

  return {
    view: { id: view.id, kind: view.kind, columns: view.columns, n: view.n },
    answer,
    insight: { type: insightType, statement: answer === "number" && view.values?.length === 2 ? `${view.values[0].label} is ${view.values[0].value}; ${view.values[1].label} is ${view.values[1].value}` : statementFor(view, insightType) },
    ...(topBuilt ? { chart: topBuilt } : {}),
    alternatives: accepted.filter((c) => c !== topBuilt).slice(0, 5),
    rejected: rejected.slice(0, 8),
    gaps,
    ...(needed ? { needed } : {}),
    ...(reason ? { reason } : {}),
    caveats,
    questionsForUser: questionsFor(view, rawCtx),
    assumptions: ctx,
  };
}

export interface RecommendOptions {
  /** How many of the profile's top views to recommend for (default 3). */
  top?: number;
}

/**
 * Recommend a chart (or a table, or a single number) for each of the profile's
 * best views. Deterministic: the same profile and context give the same answer.
 */
export function recommend(profile: DatasetProfile, context?: Context, options: RecommendOptions = {}): Recommendation[] {
  const cols = new Map(profile.columns.map((c) => [c.name, c]));
  if (profile.views.length === 0) {
    const ctx = resolveContext(context);
    const quant = profile.columns.filter((c) => c.role === "quantitative");
    const oneNumber = profile.rowCount === 1 && quant.length === 1;
    return [
      {
        view: { id: "none", kind: "distribution", columns: {}, n: profile.rowCount },
        answer: oneNumber ? "number" : "table",
        insight: { type: "ranking", statement: oneNumber ? `${quant[0].name} is ${quant[0].numeric?.mean}` : "No chartable view could be formed from these columns" },
        alternatives: [],
        rejected: [],
        gaps: [],
        reason: oneNumber ? "A single value needs a number, not a chart." : "The data has no usable pairing of category, time and measure columns; show it as a table.",
        caveats: [],
        questionsForUser: [],
        assumptions: ctx,
      },
    ];
  }
  return profile.views.slice(0, options.top ?? 3).map((v) => recommendView(v, cols, context));
}
