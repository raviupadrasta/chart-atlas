import type { ChartSpec, Datum, Layer, Tone } from "./spec.js";
import { gridAxes, hasLegend, legendSeries, margins, STYLE, titleLines } from "./style.js";

const { font, color, mark } = STYLE;

const py = (v: unknown): string => JSON.stringify(v);

/** Python literal for a list of records; JSON is valid Python for strings and numbers. */
function frame(data: Datum[]): string {
  return `pd.DataFrame(${py(data)})`;
}

function axisLines(spec: ChartSpec): string[] {
  const out: string[] = [];
  const { x, y } = spec;
  const grid = gridAxes(spec);
  if (x.kind === "category") {
    const k = x.tickEvery ?? 1;
    out.push(`ax.set_xticks(range(0, len(X_ORDER), ${k}))`, `ax.set_xticklabels(X_ORDER[::${k}])`);
  }
  if (y.kind === "category") out.push(`ax.set_yticks(range(len(Y_ORDER)))`, `ax.set_yticklabels(Y_ORDER)`, `ax.set_ylim(len(Y_ORDER) - 0.5, -0.5)  # first category at the top`);
  if (y.reverse) out.push(`ax.invert_yaxis()  # rank 1 at the top`);
  if (y.integer) out.push(`ax.yaxis.set_major_locator(MaxNLocator(integer=True))`);
  out.push(`ax.set_xlabel(${py(x.title ?? "")})`, `ax.set_ylabel(${py(y.title ?? "")})`);
  if (x.kind === "linear" && x.zero) out.push(`ax.set_xlim(left=0)`);
  if (y.kind === "linear" && y.zero) out.push(`ax.set_ylim(bottom=0)`);
  out.push(`ax.grid(False)`);
  if (grid.x) out.push(`ax.xaxis.grid(True)`);
  if (grid.y) out.push(`ax.yaxis.grid(True)`);
  out.push(`ax.set_axisbelow(True)`);
  return out;
}

const tone = (t: Tone | undefined) => py(color.tone[t ?? "accent"]);

function layerLines(l: Layer, i: number, spec: ChartSpec, lib: "matplotlib" | "seaborn"): string[] {
  const d = `d${i}`;
  const xIsCat = spec.x.kind === "category";
  const yIsCat = spec.y.kind === "category";
  const prep: string[] = [];
  if (l.mark !== "rule") {
    if (xIsCat && (l.mark === "line" || l.mark === "point" || l.mark === "tick")) prep.push(`${d}["x"] = ${d}["x"].map(X_POS)`);
    if (yIsCat && l.mark !== "line" && l.mark !== "point") prep.push(`${d}["y"] = ${d}["y"].map(Y_POS)`);
  }
  switch (l.mark) {
    case "line": {
      const series = l.data.some((r) => r.series !== undefined);
      const lw = l.thick ? mark.lineThick : mark.lineThin;
      if (lib === "seaborn") {
        const hue = l.colorBySeries ? `, hue="series", palette=SERIES[:${legendSeries(spec).length}]` : `, color=${tone(l.tone)}`;
        // Draw the rows as given: lineplot would otherwise average repeated x values (a step function has them) and add a confidence band.
        const units = series && !l.colorBySeries ? `, units="series"` : "";
        return [...prep, `sns.lineplot(data=${d}, x="x", y="y"${hue}${units}, estimator=None, sort=False, linewidth=${lw}${l.dash ? `, linestyle=(0, DASH)` : ""}, ax=ax)`];
      }
      if (series) {
        const c = l.colorBySeries ? `, color=SERIES[i % len(SERIES)]` : `, color=${tone(l.tone)}`;
        return [...prep, `for i, (name, g) in enumerate(${d}.groupby("series", sort=False)):`, `    ax.plot(g["x"], g["y"], label=name, linewidth=${lw}${c})`];
      }
      return [...prep, `ax.plot(${d}["x"], ${d}["y"], color=${tone(l.tone)}, linewidth=${lw}${l.dash ? `, linestyle=(0, DASH)` : ""})`];
    }
    case "point":
      if (lib === "seaborn") return [...prep, `sns.scatterplot(data=${d}, x="x", y="y"${l.colorBySeries ? `, hue="series", palette=SERIES[:${legendSeries(spec).length}], legend=False` : `, color=${tone(l.tone)}`}, s=${mark.pointSize ** 2}, ax=ax)`];
      if (!l.data.some((r) => r.series !== undefined)) return [...prep, `ax.scatter(${d}["x"], ${d}["y"], color=${tone(l.tone)}, s=${mark.pointSize ** 2}, alpha=${l.data.length > 200 ? 0.45 : 0.75}, zorder=3)`];
      return [...prep, `for i, (name, g) in enumerate(${d}.groupby("series", sort=False)):`, `    ax.scatter(g["x"], g["y"], color=SERIES[i % len(SERIES)], s=${mark.pointSize ** 2}, zorder=3)`];
    case "range": {
      const h = l.thin ? mark.barThin : mark.barFull;
      if (lib === "seaborn" && l.data.every((r) => r.x0 === 0) && !l.thin)
        return [`sns.barplot(data=${d}.assign(y=${d}["y"].map(Y_POS)), x="x1", y="y", orient="h", width=${mark.barFull}, color=${tone(l.tone)}, ax=ax)`];
      return [...prep, `ax.barh(${d}["y"], ${d}["x1"] - ${d}["x0"], left=${d}["x0"], height=${h}, color=${tone(l.tone)})`];
    }
    case "bin":
      return [`ax.bar(${d}["x0"], ${d}["y"], width=${d}["x1"] - ${d}["x0"], align="edge", color=${tone(l.tone)}, edgecolor=${py(color.surface)}, linewidth=1)`];
    case "tick":
      return [...prep, `ax.scatter(${d}["x"], ${d}["y"], marker="|", s=${mark.tickLength ** 2}, linewidths=${mark.tickWidth}, color=${tone(l.tone)}, zorder=4)`];
    case "rule":
      return [`ax.ax${l.axis === "x" ? "v" : "h"}line(${l.value}, color=${tone(l.tone)}${l.dash ? `, linestyle=(0, DASH)` : ""}, linewidth=${mark.ruleWidth})`];
  }
}

/** Runnable Python that draws the chart with matplotlib (or seaborn on top of it). */
export function toPython(spec: ChartSpec, lib: "matplotlib" | "seaborn"): string {
  const m = margins(spec);
  const { width: W, height: H } = spec.size;
  const rc = {
    "figure.dpi": 72, // one point is one pixel, so sizes match the other targets
    "figure.facecolor": color.surface,
    "axes.facecolor": color.surface,
    "savefig.facecolor": color.surface,
    "font.family": "sans-serif",
    "font.sans-serif": font.familyPython,
    "font.size": font.size.tick,
    "text.color": color.ink,
    "axes.labelsize": font.size.axisTitle,
    "axes.labelcolor": color.inkSecondary,
    "axes.edgecolor": color.grid,
    "xtick.labelsize": font.size.tick,
    "ytick.labelsize": font.size.tick,
    "xtick.color": color.inkSecondary,
    "ytick.color": color.inkSecondary,
    "legend.fontsize": font.size.legend,
    "grid.color": color.grid,
    "grid.linewidth": mark.gridWidth,
    "axes.spines.top": false,
    "axes.spines.right": false,
  };
  const rcPy = "{\n" + Object.entries(rc).map(([k, v]) => `    ${py(k)}: ${typeof v === "boolean" ? (v ? "True" : "False") : py(v)},`).join("\n") + "\n}";
  const titleY = STYLE.space.titleTop + font.size.title; // baseline of the first title line, px from the top
  const lines: string[] = [
    `# ${spec.title}`,
    ...spec.notes.map((n) => `# Note: ${n}`),
    ...(spec.approximation ? [`# Approximation: ${spec.approximation}`] : []),
    `import matplotlib.pyplot as plt`,
    `import pandas as pd`,
    ...(spec.y.integer ? [`from matplotlib.ticker import MaxNLocator`] : []),
    ...(lib === "seaborn" ? [`import seaborn as sns`] : []),
    ``,
    `# One look for every chart-atlas export (fonts, sizes, colours).`,
    `RC = ${rcPy}`,
    ...(lib === "seaborn" ? [`sns.set_theme(style="white", rc=RC)`] : [`plt.rcParams.update(RC)`]),
    ``,
    `SERIES = ${py(color.series)}`,
    `DASH = ${py(mark.dash).replace("[", "(").replace("]", ")")}`,
    `X_ORDER = ${py(spec.x.order ?? [])}`,
    `Y_ORDER = ${py(spec.y.order ?? [])}`,
    `X_POS = {c: i for i, c in enumerate(X_ORDER)}`,
    `Y_POS = {c: i for i, c in enumerate(Y_ORDER)}`,
    ``,
    ...spec.layers.flatMap((l, i) => (l.mark === "rule" ? [] : [`d${i} = ${frame(l.data)}`])),
    ``,
    `W, H = ${W}, ${H}  # pixels`,
    `fig, ax = plt.subplots(figsize=(W / 72, H / 72))`,
    `fig.subplots_adjust(left=${m.left} / W, right=1 - ${m.right} / W, top=1 - ${m.top} / H, bottom=${m.bottom} / H)`,
    ...spec.layers.flatMap((l, i) => layerLines(l, i, spec, lib)),
    ...axisLines(spec),
    `fig.text(${8} / W, 1 - ${titleY} / H, ${py(titleLines(spec.title).join("\n"))}, ha="left", va="baseline", fontsize=${font.size.title}, fontweight=${py(font.titleWeight >= 600 ? "bold" : "normal")}, color=${py(color.ink)})`,
    ...(spec.notes.length ? [`fig.text(${8} / W, 1 - ${titleY + (titleLines(spec.title).length - 1) * Math.round(font.size.title * 1.3) + 20} / H, ${py(spec.notes.join(" · "))}, ha="left", va="baseline", fontsize=${font.size.subtitle}, color=${py(color.inkSecondary)})`] : []),
    ...(hasLegend(spec) ? [`ax.legend(frameon=False, loc="upper left", bbox_to_anchor=(1.02, 1))`] : []),
    `plt.show()`,
  ];
  return lines.join("\n");
}
