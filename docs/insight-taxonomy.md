# Insight taxonomy and chart-selection rubric

Draft for review. This is the contract the profiler, catalog and recommender are built against. Nothing here is
code yet; changing it is cheap now and expensive later.

## 1. The question comes before the chart

A chart is chosen to make **one claim** legible. The recommender's first output is therefore an *insight
statement* ("Three of nine regions account for 70% of revenue"), not a chart type. Chart choice follows from
(insight type × data structure), filtered and ranked by the rubric in section 4.

## 2. Insight types

Each type lists the **data signal** the profiler must detect and the **chart family** it usually points to.
Charts marked `(baseline missing)` are not yet in chart-atlas.

| # | Insight type | Reader's question | Data signal (profiler) | Charts |
|---|---|---|---|---|
| 1 | Ranking / comparison | Which is biggest/smallest? | 1 nominal + 1 quantitative, 3–30 rows | bar `(baseline missing)`, dotPlot (roadmap, dot plot), bullet (if target) |
| 2 | Change over time (incl. cycle vs history) | How did it move? Is this cycle normal? | temporal axis + quantitative, ≥ 8 points; optionally repeating cycles with one flagged current | line `(baseline missing)`, seasonalOverlayChart (cycle variant), intervalBand (roadmap), horizon (roadmap) |
| 3 | Two-point change | Who rose/fell between A and B? | 2 time points or before/after per entity | slope (roadmap), dumbbell (roadmap) |
| 4 | Rank change over time | Who overtook whom? | entity × period with rank or rankable values | bumpChart |
| 5 | Part-to-whole | What share is each part? | non-negative values, meaningful total | treemapChart (many parts), waffle (roadmap), stacked bar `(baseline missing)`; pie only ≤ 4 parts |
| 6 | Two-level composition | Share within share | 2 nominal levels + value | marimekkoChart |
| 7 | Concentration | Do a few drive most? | skewed positive values; top-k share > 50% | concentrationCurveChart |
| 8 | Bridge / contribution | How did A become B? | start, signed deltas, end | waterfallChart |
| 9 | Range / sensitivity | How uncertain by method? Which input swings the outcome most? | low/high per entity, optionally around a base case | footballFieldChart, tornadoChart (base-case variant), errorBars (roadmap) |
| 10 | Variance vs target | Are we on target? | actual, target, qualitative bands | bulletChart |
| 11 | Distribution | What is the shape/spread? | one quantitative, n ≥ 30 | histogram `(baseline missing)`, boxplot/violin (roadmap) |
| 12 | Relationship | Do X and Y move together? | ≥ 2 quantitative columns | scatter `(baseline missing)`, bcg/impact-effort (labelled 2×2 only) |
| 13 | Flow | Where does the quantity go? | source, target, value | sankeyChart |
| 14 | Hierarchy / decomposition | What drives the KPI? | parent-child or operator tree | driverTreeChart, treemapChart |
| 15 | Cost-volume tradeoff | Which levers are cheapest per unit? | cost per unit + volume per option | costCurveChart |
| 16 | Magnitude + duration pair | How big and how long? | two linked measures per entity | radialBadgeBarChart |
| 17 | Outlier / anomaly | What is unusual? | residual/z-score flags on any of the above | annotate the chosen chart, do not switch chart |

Type 17 and "dominant category" are **annotations** layered on a primary insight, not separate charts.

## 3. Profiler output the rules consume

Per column: `role` (quantitative | ordinal | nominal | temporal | id), `cardinality`, `missing%`, `min/max`,
`skew`, `modality`, `unit` (percent, currency, count), `sign` (all ≥ 0?).
Per dataset: `rows`, `structure` flags (`timeSeries`, `tidy vs wide`, `hierarchy`, `flow`, `partToWhole`
(shares sum ≈ 100%), `paired`, `rankOverTime`, `hasInterval`, `hasTarget`), and ranked `findings`
(trend, seasonality, top-k concentration, outlier, dominant category, correlation, largest change).
It is emitted as stable JSON so an LLM can read it too.

## 4. Rubric (checkable rules)

Sources: Tufte (data-ink, chartjunk, small multiples, lie factor), Cleveland & McGill (perceptual accuracy
ranking), Few (bullet graphs, dashboard restraint), Cairo (truthfulness). Each rule is `hard` (excludes a
chart) or `soft` (score adjustment) and is unit-tested.

Perceptual ranking used to score encodings (best → worst): position on a common scale → position on
non-aligned scales → length → angle/slope → area → volume/colour saturation.

| ID | Rule | Kind |
|---|---|---|
| R1 | Prefer common-scale position/length encodings for the key comparison | soft |
| R2 | Bar/length encodings must start at zero; lines/dots may not | hard |
| R3 | No pie/donut above 4 slices or when values are close (< 5% gap) | hard |
| R4 | No dual y-axes; use small multiples or indexed series instead | hard |
| R5 | No 3D, no decorative fills; each mark must carry data (data-ink) | hard |
| R6 | Time always on the x-axis, left→right; ordinal categories keep their natural order, nominal are sorted by value | soft |
| R7 | More than 5 series → small multiples or highlight-one-grey-rest, not a spaghetti chart | hard/soft |
| R8 | Direct labels over legends when ≤ 8 series | soft |
| R9 | Colour encodes only what it must (emphasis, category, status); ≤ 7 categorical hues | soft |
| R10 | Log scale only with explicit label and strictly positive data | hard |
| R11 | Chart must fit cardinality: too few points (< 3) → table/number; too many → aggregate/facet | hard |
| R12 | Encode uncertainty when data provides intervals; never hide it | soft |
| R13 | Truncated/aggregated data must be disclosed in the rationale | hard |
| R14 | A single number or two-point comparison does not need a chart; say so | soft |

## 5. Recommendation output

```
{ insight: "one-sentence claim",
  chart: "waterfallChart" | "table" | "number", score, mapping: { ...columns -> chart data },
  reasons: ["why this fits (rule ids)"],
  rejected: [{ chart, because: "R3: 11 slices" }],
  caveats: [...] }
```

## 6. Open questions for review

1. ~~Granularity~~ Resolved: merged to 17 types (cycle-vs-history into change over time; sensitivity into range).
2. ~~No-chart answers~~ Resolved: yes. The recommender may return `table` or `single number` (with a reason) when data is too small/simple (R11, R14); a chart is rendered only if the user opts in.
3. ~~Pie rule~~ Resolved: R3 stays a hard ban above 4 slices (or slices within 5% of each other).
4. ~~Build order~~ Resolved: profiler + catalog first. Where a baseline chart (bar, line, scatter, histogram)
   is missing, the recommender reports "baseline chart needed"; those gaps set which chart is built next.

All four review questions are resolved; the taxonomy is approved as the contract for the profiler.

---

## 7. Wilke's *Fundamentals of Data Visualization* as the thinking framework

Source: Claus Wilke, <https://clauswilke.com/dataviz/> (repo: clauswilke/dataviz). Its structure is
"data → aesthetic mapping → figure type → figure-design principles". We adopt that as the order the system
reasons in, so every recommendation can cite the chapter it rests on.

### 7.1 Thinking pipeline (order of decisions)

1. **Classify variables into scale types** (ch. 2): continuous vs discrete; quantitative, ordered, unordered,
   date/time, proportion, count. This drives which aesthetic may carry the variable (position/length for
   quantitative, colour hue only for unordered categories, sequential colour for ordered).
2. **Choose the aesthetic mapping** (ch. 2): position first, then length/size, then colour, then shape/line type.
   Spend the strongest aesthetic on the variable the insight is about.
3. **Choose coordinate system and axes** (ch. 3): Cartesian by default; log axes for ratio/multiplicative data;
   polar only for cyclical data; axis range must include zero for bar/area marks.
4. **Choose colour role** (ch. 4): *qualitative* (categories), *sequential* (ordered magnitude), *diverging*
   (deviation from a meaningful midpoint), or *highlight* (one accent, rest muted).
5. **Choose figure family from the "directory of visualizations"** (ch. 5) by the question type:
   amounts (ch. 6) · distributions (ch. 7–9) · proportions (ch. 10–11) · associations (ch. 12) ·
   time series and trends (ch. 13–14) · geospatial (ch. 15) · uncertainty (ch. 16).
6. **Apply figure-design principles** (Part II, ch. 17–26) as the rubric checks in 7.3.

### 7.2 Profiler additions this implies

| Profiler output | Why (chapter) |
|---|---|
| `scaleType` per column (continuous/discrete × quantitative/ordered/unordered/temporal/proportion/count) | ch. 2 aesthetic mapping |
| `isRatioData` (positive, spans orders of magnitude, or values are ratios/fold changes) | ch. 3 log axes |
| `hasMeaningfulMidpoint` (0, a target, a mean) | ch. 4 diverging vs sequential colour |
| `nGroups` and per-group `n` for a numeric variable | ch. 9 multiple distributions: few groups → boxplot/violin/ECDF; many → ridgeline; tiny n → strip/jitter |
| `binSensitivity` (does the histogram shape change with bin width; modality by KDE bandwidth) | ch. 7: try several bin widths / density; do not trust one |
| `distributionShape` (skew, heavy tails, multimodal) | ch. 7–8: ECDF or q-q when tails matter |
| `partToWholeKind` (single split, nested, multi-way, compositions over time) | ch. 10–11: bars vs stacked vs treemap/mosaic |
| `overplotRisk` (n large relative to plot area, duplicates/ties) | ch. 18: transparency, 2D bins, contours |
| `timeStructure` (individual series, connected scatter, smooth trend, seasonality) | ch. 13–14: line vs dot vs smoothed trend; detrend if the trend hides the pattern |
| `hasUncertainty` (interval, SE, CI, replicates, forecast ensemble) | ch. 16: error bars, confidence bands, fan/ensemble |
| `pairedStructure` (same unit measured twice) | ch. 12: slope/dumbbell rather than two bars |
| `hasGeo` (lat/lon, region codes) | ch. 15 |
| `panelCandidates` (a categorical column that could facet) | ch. 21: multi-panel with shared scales |

### 7.3 New rubric rules from Part II (added to section 4)

| ID | Rule (chapter) | Kind |
|---|---|---|
| R15 | **Proportional ink** (ch. 17): ink/area must be proportional to the value; bars and areas start at zero; no truncated bars | hard (extends R2) |
| R16 | **Overplotting** (ch. 18): if `overplotRisk`, use transparency, binning or contours, not raw opaque points | hard |
| R17 | **Colour pitfalls** (ch. 19): no rainbow scale; palettes must be colour-vision-deficiency safe; not too many hues; existing `validate-palette` covers this | hard |
| R18 | **Redundant coding** (ch. 20): reinforce the key encoding with a second channel (label, order, direct annotation) so the chart survives greyscale/CVD | soft |
| R19 | **Multi-panel figures** (ch. 21): panels share scales and sort order; same axes across facets | hard |
| R20 | **Titles, captions and tables** (ch. 22): the title states the insight; a caption carries method/units; small data may be a table (supports R14) | soft |
| R21 | **Balance data and context** (ch. 23): add reference lines/annotations only when they support the claim | soft |
| R22 | **Axis labels and legends** (ch. 24): large legible labels, direct labelling, units always shown | soft |
| R23 | **No 3D, no decorative geometry** (ch. 26; extends R5) | hard |
| R24 | **Uncertainty is shown, not implied** (ch. 16; extends R12) | soft/hard when intervals exist |
| R25 | **Choose bin width / bandwidth deliberately** (ch. 7): histograms and density plots state their bin/bandwidth; recommend ECDF when the shape is sensitive | soft |
| R26 | **Paired data are drawn as pairs** (ch. 12): slope graph or dumbbell, not adjacent bars | soft |

### 7.4 Taxonomy consequences

- Insight 11 (Distribution) splits in the catalog into *single distribution* (histogram, density, ECDF) and
  *many distributions* (boxplot, violin, strip/sina, ridgeline). Insight 12 (Relationship) gains
  *correlation matrix* and *bubble* variants; insight 9 gains *confidence band* and *fan*. These are catalog
  variants; the number of insight types stays at 17.
- Chart-atlas roadmap items map onto chapters: boxplot/violin/ridgeline/beeswarm (ch. 9), sunburst/icicle and
  marimekkoChart (ch. 11), scatterBubble/correlationHeatmap/splom (ch. 12), intervalBand/fan/errorBars (ch. 16),
  choropleth (ch. 15). New baseline additions the book calls for: ECDF and q-q (ch. 8).

## 8. How the project functions, end to end

```
   CSV / JSON / rows
        │
        ▼
 1. PROFILE (deterministic code, src/profile/)
    per-column scale type, cardinality, distribution, ratio/sign/midpoint
    dataset structure: time series? paired? nested? flow? intervals? geo?
    candidate FINDINGS: trend, concentration, outlier, biggest change, correlation
        │  emits profile.json  (stable schema)
        ▼
 2. FRAME THE INSIGHT (Claude skill reading profile.json)
    picks the one claim worth making; states it in a sentence
    (Wilke ch.2 aesthetic mapping + ch.5 directory decide the figure family)
        │
        ▼
 3. RECOMMEND (deterministic code, src/recommend/ + src/catalog/)
    hard-filter charts whose data shape or rubric rules (R1-R26) fail
    score the survivors by insight-fit, perceptual rank, cardinality fit
    output: ranked candidates, rejected charts with the rule that killed them
        │
        ▼
 4. CHOOSE + JUSTIFY (Claude skill)
    picks from the shortlist, writes the rationale citing rule ids and chapters,
    states caveats (aggregation, truncation, small n); may answer "table"/"number"
        │
        ▼
 5. MAP + RENDER (src/recommend/map.ts, existing chart-atlas factories)
    rows → the chart's data shape → SVG in the shared theme, with title = insight
        │
        ▼
    rendered chart + rationale + rejected alternatives
```

Example: a CSV `region, revenue`, 9 rows. Profiler: 1 unordered categorical + 1 non-negative quantitative;
partToWhole plausible; finding "top 3 regions = 71% of revenue". Skill frames insight: *concentration*.
Recommender: pie rejected (R3, 9 slices), stacked bar rejected (single split, ch. 10), candidates =
concentrationCurveChart, sorted bar (baseline missing), treemap. Skill picks concentrationCurveChart for the
concentration claim and says why; the mapper turns the revenue column into the `number[]` it expects.

Where each half runs: steps 1, 3 and 5 are plain TypeScript with unit and golden tests (reproducible).
Steps 2 and 4 are the Claude skill, which is where judgment about "what is worth saying" lives. Without the
skill the deterministic path still returns a ranked, justified shortlist.

## 9. Open questions for review (second round)

1. ~~Citations~~ Resolved: chapter references stay internal (code, docs, rule metadata). User-facing rationale states the principle in our own words and does not cite chapters.
2. ~~Licence~~ Resolved: principles only. We never copy the book's text or figures; we paraphrase and link to it.
3. ~~ECDF / q-q~~ Resolved: ECDF joins the baseline set (bar, line, scatter, histogram, ECDF); q-q is deferred until a dataset or question needs it.

---

## 10. Tufte, *Seeing with Fresh Eyes* (2020): principles adopted

Paraphrased in our own words. References are internal; no text or figures are reproduced.

**Coverage, stated honestly.** The book was a scanned image epub, read via local OCR. Read closely: the
introduction, chapter 1's opening, chapter 3 (graphical sentences), the opening third of chapter 4 (data
analysis when truth matters), the section headings of the rest of chapter 4, and the core statement of
chapter 5 (annotations). Not read: chapter 2 (typography), 6 (instructions), 7 (lists), 8 (meetings) and
the visual-index chapter, judged out of scope for chart selection. *The Visual Display of Quantitative Information* is covered
separately in section 12, checked against the source.

### 10.1 Principles (what the book adds that Wilke's does not)

| ID | Principle | Effect on the system |
|---|---|---|
| T1 | **Question the default.** Convention is not evidence; look at the data as if for the first time. | The skill must justify why the conventional chart is or is not right, not reach for it. |
| T2 | **Space carries meaning.** Spacing separates and groups; blank space is a design material. | Group by spacing rather than boxes and rules; keep existing mark-spec gaps deliberate. |
| T3 | **Connections should say what they do.** A link should name the mechanism (cause, flow, trade-off), not just join two nodes. | Flow, tree and network charts need labelled links; an unlabelled link is a caveat. |
| T4 | **Annotate in place.** Words, numbers and marks belong on the display, explaining how to read it. | Annotation is part of the recommendation output (extends R20, R21). |
| T5 | **Data rarely speak for themselves; their credibility comes first.** How the numbers were measured matters more than how they are drawn. | The system must surface data-credibility caveats before, and alongside, the chart. |
| T6 | **Look at the raw data.** Graphics that show every observation expose errors and fabrication that summaries hide; heavy smoothing and binning hide them. | Prefer showing points/ECDF over binned or smoothed summaries where n allows. |
| T7 | **Binning imposes the analyst's thresholds**, not the data's. | Binned or bucketed variables get a caveat; recommend against re-binning continuous data (extends R25). |
| T8 | **Observations may not be independent.** Repeated measures on one unit, or adjacent time points, are not separate evidence. | Detect repeated-measures and autocorrelation structure; count effective n, not rows. |
| T9 | **The dataset may not contain the answer.** The relevant explanatory variable may be absent. | The recommender may conclude "this data cannot show that" instead of forcing a chart. |
| T10 | **Model choice shapes the message.** The same data with different fits or models tell different stories. | If a trend or fit is drawn, state the method, and show the raw points under it. |
| T11 | **Subgroup slicing invites cherry-picking.** | Flag findings that come from many slices; state how many slices were examined. |
| T12 | **Measurement error is usually ignored and should be shown.** | Extends R12/R24: if error is known, encode it; if unknown, say so. |
| T13 | **Provenance.** Ask why, how and by whom the data were collected, and whether it is primary data. | The skill asks provenance questions before finalizing a recommendation. |

### 10.2 Profiler additions

| Profiler output | Why |
|---|---|
| `repeatedMeasures` (an id column repeats; several rows per unit) and `autocorrelation` for time series | T8: effective n |
| `alreadyBinned` (values are bucketed or thresholded ranges) | T7 |
| `sliceCount` (how many groupings/filters a claim rests on; supplied by the caller when known) | T11 |
| `missingVariableHints` (the question implies a variable not in the columns) | T9 |
| `hasMeasurementError` (SE/CI/error column present or documented) | T12 |
| `provenance` (optional metadata: source, collection method, primary vs derived) | T13 |

### 10.3 New rules (continue the R-numbering)

| ID | Rule | Kind |
|---|---|---|
| R27 | Where n is small enough to show every observation, show them (points, strip, ECDF) rather than only a summary | soft |
| R28 | Do not bin or smooth continuous data unless the binning/bandwidth is stated and the raw data remain visible or available | soft/hard on request |
| R29 | Repeated or serially dependent observations must not be presented as independent; report effective n | hard (caveat required) |
| R30 | A fitted line, trend or model states its method and shows the underlying points | soft |
| R31 | Links in flow/tree/network charts carry a label or value naming what they represent | soft |
| R32 | If the question needs a variable the data lacks, say the data cannot answer it | hard (answer may be "no chart") |
| R33 | Claims from subgroups disclose how many subgroups were examined | soft (caveat) |

### 10.4 The big consequence: a caveat channel

Tufte's chapter 4 is mostly not about drawing. It is about whether the evidence deserves the drawing. That
turns the recommendation output from section 5 into:

```
{ insight, chart, mapping, reasons, rejected,
  caveats: [{ id: "T8", severity: "warn", text: "12 rows per patient: effective n is the patient count, not 300" }],
  questionsForUser: ["How were these values measured, and by whom?"] }
```

`caveats` are produced by the deterministic profiler (T7, T8, T9, T12). `questionsForUser` come from the
skill (T13, T11), because only the user knows provenance.

## 11. Cairo, *The Art of Insight* (2023): a check on our own rigidity

Paraphrased; references internal. **Coverage:** read closely the introduction, chapters 1–2 (his "discourses"
of visualization and a worked design example) and the epilogue; the remaining 20 chapters are interviews with
individual designers and were not read. This is a book about how designers think, not a rulebook, and its
author says it is deliberately not a system. Its value to us is as a counterweight.

### 11.1 What it says that changes the design

| ID | Principle | Effect on the system |
|---|---|---|
| C1 | **No graphic form is good or bad in essence.** Any chart type can be misused; rules are guidance whose pertinence depends on context (even Tufte qualifies his own with "within reason"). | Split rules by strength (11.2). Most chart-type bans become overridable defaults, not hard filters. |
| C2 | **Choose by purpose, audience, means and constraints**, plus whatever evidence exists, then make choices that are deliberate and justifiable. | The recommender takes a `context` input (11.3), and every decision carries a stated reason. |
| C3 | **Three tests for a design: utility, soundness, attractiveness.** Utility: does it do the job for its reader. Soundness: is it reliable and built on familiar, well-tested forms. Attractiveness: appeal and originality. | Scoring is reported on these three axes, not one number. Soundness favours conventional forms; attractiveness is a tie-breaker, never a filter. |
| C4 | **Start from the point.** What is the graphic for, who reads it, what should they see? Then test whether to show aggregates or the whole distribution. | Matches our "insight first" step. Adds: default to showing the distribution when an average alone would hide spread (extends R27). |
| C5 | **Position on a common scale suits accurate estimation**; other encodings are chosen when the purpose differs. | Perceptual ranking (section 4) applies when the purpose is accurate reading, and relaxes for other purposes. |
| C6 | **Redundant encoding is legitimate**: a second channel can help the reader who would miss the point. | Supports R18. Redundancy is not "ink waste" by default. |
| C7 | **Admit taste.** Many design decisions are preference passed off as norm. | Rule metadata records whether a rule is evidence-backed, convention, or taste (11.2). |
| C8 | **Do not judge one dialect by another's conventions** (a business dashboard is not a news graphic). | `context.medium` changes which defaults apply. |
| C9 | **Encodings of uncertainty are misread in practice** (the hurricane cone is read as a danger boundary). | Probabilistic displays require a reading aid or a frequency-style alternative (extends R24). |
| C10 | **What is left out matters as much as what is shown**; leaving room for interpretation can be a valid choice for some purposes. | For explanatory/analytic use we still disclose omissions (R13); the artistic case is out of scope. |
| C11 | **Critics prescribe before they understand** ("it should have been a bar chart"). | The rationale explains reasons and invites challenge instead of issuing verdicts. |

### 11.2 Rule tiers (the structural change this book argues for)

Not every rule has the same standing. We tag each rule with a tier and an evidence basis:

| Tier | Meaning | Behaviour | Examples |
|---|---|---|---|
| **Integrity** | Breaking it makes the chart say something false | Hard filter; cannot be overridden | Bars/areas start at zero (R2, R15); no rainbow scales (R17); no dependent observations shown as independent (R29); log axes labelled (R10); uncertainty not hidden when known (R12) |
| **Default** | Sound guidance that usually holds | Applied automatically; overridable when `context` justifies it, and the override is stated in the rationale | Pie limit (R3), no dual axis (R4), direct labels (R8), data-ink (R5), small multiples (R7) |
| **Taste** | Style preference or personal worldview | Tie-breaker only; never excludes a chart | Minimalism, colour flourish, decorative shading |

Each rule also records `basis`: `evidence` (perception/statistics research), `convention` (widely used, tested
in practice) or `taste`. Any rule whose source has not been read is additionally marked `unverified` (none at present).

### 11.3 New input: `context`

```
context: {
  purpose:  "explore" | "explain" | "monitor" | "persuade" | "reference",
  audience: "self" | "expert" | "executive" | "public",
  medium:   "dashboard" | "report" | "slide" | "article" | "mobile",
  constraints: { maxWidth?, colorOnly?: false, printGrayscale?: boolean }
}
```

Defaults when not supplied: `explain` / `expert` / `report`. The purpose changes scoring (explore favours showing
all data; monitor favours compact, comparable, conventional forms; explain favours one clear claim with
annotation). The output states which context assumptions it used.

## 12. Tufte, *The Visual Display of Quantitative Information* (2nd ed.): verified

Read from a text-layer PDF: the contents, the principle statements of every chapter, and the passages on
integrity, time series, relational graphics, data density and small multiples. Not read line by line: the
historical examples and the long case-study captions. Paraphrased; references internal. This replaces the
"from memory" status of R2, R5, R7 and the lie factor; they are now source-checked.

### 12.1 What checking the source confirmed or corrected

| Earlier assumption | What the source says | Change |
|---|---|---|
| R5 "data-ink" | Maximize the data-ink ratio, erase non-data ink, erase redundant data ink, revise and edit; each is qualified "within reason". | Confirmed. Tier: Default (Cairo's point about "within reason" holds). |
| Lie factor | Ratio of the effect size shown in the graphic to the effect size in the data; 1 is honest, outside 0.95–1.05 is substantial distortion. | Confirmed, and it is **measurable**: we can test our own renderers (R34). |
| R14 small data need no chart | Tables usually beat graphics for data sets of about 20 numbers or fewer; the power of graphics is large data sets. | Confirmed, and it gives us a **number** (about 20) for the no-chart threshold. |
| R7 small multiples | The same design repeated across an index variable, so the viewer attends to changes in data, not in design. | Confirmed. |
| Time on the x axis is enough | Time alone is not an explanatory variable; a time series can be moved toward explanation by adding variables. | **New** (R40). |

### 12.2 The six integrity principles (paraphrased)

1. The physical size of a mark must be directly proportional to the number it represents.
2. Label thoroughly on the graphic itself to defeat distortion and ambiguity; label important events.
3. Show variation in the data, not variation in the design.
4. For money over time, use deflated, standardized units rather than nominal ones.
5. The number of information-carrying dimensions must not exceed the number of dimensions in the data.
6. Do not quote data out of context.

### 12.3 Other principles from the book

| ID | Principle | Effect |
|---|---|---|
| V1 | **Graphical excellence** is complex ideas communicated with clarity, precision and efficiency, and is nearly always multivariate. | Prefer designs that carry several variables when the insight needs them. |
| V2 | **Data density**: within reason, more data per unit area is better; low-information designs are suspect (what was left out, and why). Summarize (average, cluster, smooth) only when a display would otherwise be overcrowded. | Scoring rewards density; a sparse chart of few numbers triggers "use a table". |
| V3 | **Shrink principle**: most graphics can be much smaller without losing legibility, which leads to small multiples. | Small multiples are the preferred answer to many-series problems. |
| V4 | **Chartjunk**: moiré vibration, heavy grids, and the "duck" (a graphic that is itself decoration). Grids should be muted or suppressed. | Supports R5; adds a specific grid rule (R37). |
| V5 | **Multifunctioning elements**: an axis can double as data (range frames, quartile frames, dot-dash plots), but avoid encodings only their inventor can decode. | Optional refinement for future chart styles; clarity outranks cleverness. |
| V6 | **The relational graphic (scatter and variants) is the strongest form** for asking whether X relates to Y, and invites causal thinking. | Relationship insights get scatter first; the caveat channel warns that association is not cause. |
| V7 | **Time series dominate practice** but descriptive chronology is not causal explanation. | Time-series output carries a caveat when a causal reading is likely. |
| V8 | **Graphics fail mostly from lack of quantitative judgment**, not lack of decoration; "if the statistics are boring, you have the wrong numbers". | The skill checks whether the numbers answer the question before dressing them (extends T9). |

### 12.4 New rules (continue numbering)

| ID | Rule | Tier | Basis |
|---|---|---|---|
| R34 | **Lie factor in [0.95, 1.05]**: rendered mark size must be proportional to the value it encodes. Enforced by renderer tests, not only by chart choice. | Integrity | evidence |
| R35 | Monetary series over time are shown in real (deflated) units, or explicitly labelled nominal | Integrity when the horizon is long; otherwise Default | evidence |
| R36 | Do not encode one-dimensional data with a two- or three-dimensional mark (area/volume) unless the area itself is the quantity and is proportional | Integrity | evidence |
| R37 | Grids are muted or suppressed relative to the data | Default | convention |
| R38 | A comparison states its context/baseline (per capita, adjusted, versus what) | Default (Integrity if the raw comparison misleads) | evidence |
| R39 | Fewer than about 20 values with no pattern to show: recommend a table | Default | convention |
| R40 | A time series that may invite a causal reading carries a caveat and, where possible, added variables | Default | evidence |

### 12.5 Audit of our own 15 charts (done: `test/lie-factor.test.ts`)

Each chart is rendered with known values and the rendered mark sizes are compared to the data ratios. Lie
factor tolerance is [0.95, 1.05]. Result: 12 chart behaviours were proportional and 6 defects were found; defects 1 and 2 are now fixed (see
below). The remaining defects are pinned as `it.fails` tests, so they pass today and turn red the moment a fix lands.

Proportional (checked): `waterfallChart`, `bulletChart`, `tornadoChart`, `footballFieldChart`, `costCurveChart`
(for normal-sized bars), `radialBadgeBarChart` bar heights, `sankeyChart` node heights, `marimekkoChart`,
`concentrationCurveChart`, `seasonalOverlayChart`, and `treemapChart` for sizeable tiles. The radial ring is
proportional except that the longest ring is compressed by 3% (lie factor 0.97, inside tolerance).
`bumpChart` and `driverTreeChart` encode rank and structure, not magnitude, so the audit does not apply.

Defects found:

| # | Chart | Defect | Lie factor | Proposed fix |
|---|---|---|---|---|
| 1 | `bcgMatrixChart` | **FIXED.** Bubble radius had a minimum offset, so area was not proportional to revenue: a 4x revenue gap looked like about 2.7x | was ~0.67, now 1.0 | Radius = sqrt scale from zero (`core/quadrant-scatter.ts`) |
| 2 | `impactEffortMatrixChart` | **FIXED** with #1 (shared helper) | was ~0.67, now 1.0 | Same change |
| 3 | `treemapChart` | The 2px gap comes out of each tile, so tiny tiles lose a larger share: a 1% tile is drawn at about 85% of its area | about 0.85 | Compute area before the gap, or shrink tiles by a fixed inset equally in the layout and disclose |
| 4 | `waterfallChart` | Minimum bar height of 1 unit exaggerates tiny steps (a 0.14 step and a 0.03 step both draw at 1) | 7 and larger | Keep a hairline for visibility but mark it as "below scale" (dotted) rather than a real bar |
| 5 | `costCurveChart` | Bar width is volume-scaled minus a 1-unit gap, so volumes narrower than the gap collapse to the same 0.5 width | 0.5 for volume 2 | Clamp the gap to a fraction of the bar width |
| 6 | `footballFieldChart` | Minimum bar width of 1 unit widens very narrow ranges | about 2.5 | Same "below scale" treatment as #4 |

Defects 3-6 bite only at extremes (small tiles or extreme range differences); defects 1-2 apply to every use.
Until fixed, the recommender must treat them as caveats: for charts 3-6 it should warn when the profiler
finds values below a threshold share of the range.

## 13. Open questions for review (third round)

1. ~~Caveats every time~~ Resolved: `caveats` and `questionsForUser` are a first-class output of every recommendation, kept short and shown only when a check fires.
2. ~~VDQI unverified~~ Resolved: source received and checked (section 12); the memory-based rules are now source-checked.
3. ~~Rule tiers~~ Resolved (delegated to Claude, 2026-09-19): adopt the three tiers. R3 (pie limit) becomes a
   **Default**: applied automatically, overridable when `context` justifies it, override stated in the rationale.
   Only Integrity rules (R2, R10, R12, R15, R17, R29, R34, R36, and R35 on long horizons) are hard filters.
4. ~~Context input~~ Resolved (delegated): `context` is optional, with defaults explain / expert / report; the
   output always states the assumptions it used.
5. ~~Lie-factor audit~~ Resolved (delegated): yes, a renderer-level test per chart, scheduled right after the catalog.

---

## 14. Profiler status (as built, `src/profile/`)

`profileDataset(rows, { pin?, maxViews? })` returns `{ rowCount, columnCount, columns, views }`, JSON-safe.

**Built**
- Column roles and subtypes, units, missing values, cardinality, numeric and temporal stats, with a note per decision.
- **Ranked candidate views** (decided: ranked list, not one view): measure by category, measure over time (with an optional series column), distribution, relationship, range (low/high columns) and target (actual/target columns). Each view carries `structure` flags (`partToWhole`, `timeSeries`, `cyclical`, `rankOverTime`, `hasInterval`, `hasTarget`), `findings`, `caveats`, a 0-100 `score` and three `reasons`. Score = 40% fit + 35% signal (strongest finding) + 25% quality (rows usable).
- Findings: concentration, dominant category, spread, trend (judged on a cycle-smoothed series when the data is cyclical), seasonality (after removing the trend), biggest change, correlation, skew, outliers, widest range, target gap.
- Caveats on every view where a check fires (R6, R10, R13, R27, R35, R39, R40, T5, T8, V6).
- Ids and empty columns are never plotted; `pin` restricts to views using named columns.

**Not built yet** (from sections 7.2 and 10.2)
- Structure detection for `hierarchy`, `flow` and `paired` data, and view kinds that use them (sankey, tree, slope).
- `repeatedMeasures` / autocorrelation counting effective n (T8, R29), `alreadyBinned` (T7), `binSensitivity` and modality (R25), `overplotRisk` (R16), `hasMeasurementError` (T12), `sliceCount` (T11), caller-supplied provenance (T13).
- Rank-over-time from a values column is only flagged, not verified to be rankable without ties.
- Scoring weights are a first guess; they should be tuned against real datasets once the recommender exists.

---

## 15. Recommender status (as built, `src/recommend/`)

`recommend(profile, context?, { top? })` returns one `Recommendation` per top view: `answer`
(`chart` | `table` | `number` | `baseline-needed`), the `insight` (type and a one-sentence claim taken from the
view's findings), the chosen `chart` with score, reasons and stated overrides, `alternatives`, `rejected` (each with
the reason and rule), `gaps` (planned charts that would beat the built choice), `caveats`, `questionsForUser` and
the `assumptions` it used for `context`.

How it decides:
1. **Insights for the view**, weighted: concentration 1.0, part-to-whole 0.85, ranking 0.75-0.95, change over time 1.0,
   rank change 0.9, and so on.
2. **Catalog filter (Integrity)**: structure the chart needs (e.g. `hasBase` for tornado), no negative values for
   charts that cannot show them, minimum rows. A failure is a rejection with its reason.
3. **Guidance (Default)**: past a chart's usual row limit it loses fit and the override is stated, up to 1.5x the
   limit; beyond that it is rejected. Encoding preference (R1) takes 8 points off a chart when a clearly stronger
   channel exists for the same insight.
4. **Score (Cairo's three axes)**: 55% utility (insight fit, encoding, purpose), 35% soundness (how familiar the form is
   to this audience), 10% attractiveness (tie-break), times a row-limit fit factor.
5. **No-chart answers**: two values give `number`; few values with no pattern give `table` (chart still offered;
   `forceChart` returns it as the answer). If no built chart fits, the answer is `baseline-needed` and names the
   missing chart.
6. **Known rendering limits** from the lie-factor audit (`knownIssues` on catalog entries) are attached to the chosen
   chart as caveats (R34).

Deliberately not done yet: mapping the view's data into the chosen chart's data shape and rendering it; the skill that
frames the insight and writes prose; two-level composition, flow, hierarchy and paired views (they need the profiler
gaps in section 14); tuning the weights on real datasets. The scores are a first guess and mostly serve to order
candidates; the golden tests in `test/recommend.test.ts` pin the answers, not the numbers.

Findings from building it: a constant integer column (the same target on every row) was being classed as an ordinal
scale, which hid the target view; fixed. A small-integer column with 7 distinct values (e.g. `50 + i % 7`) is still read as
a rating scale, which is a known limit of the heuristic.

### 15.1 Mapping and rendering (added)

`recommendAndRender(container, rows, context?, { theme?, annotate?, profile?, viewIndex? })` profiles the rows,
recommends, maps the chosen view into the chart's data shape (`src/recommend/map.ts`) and draws it. The insight
becomes the title (R20) and the caveats become the caption, so a chart never looks more certain than its data. A
`table` or `number` answer is drawn as a table or a large number; `baseline-needed` shows the data as a table with a
message naming the missing chart. If the first choice cannot be built from the data (for example a seasonal overlay
with fewer than three full cycles), the next built alternative is tried, then a table.

Adapters exist for seven charts, each tied to the view kinds it can be fed from (`FED_BY`); the recommender rejects a
built chart with no adapter for the view at hand, so it never recommends something it cannot draw:
concentration-curve and treemap (by category), seasonal-overlay and bump (over time), football-field and tornado
(range, tornado needs a base case), bullet (target). Things the adapters had to derive are reported as caveats, not
hidden: bullet bands are drawn at 70% and 90% of each target; seasonal-overlay drops an incomplete first cycle and plots
raw values with a reference line at the average starting value; bump ranks are computed from the values, keeping the 8
highest-average series.

Found by looking at it in a browser (demo card "Recommender"), not by the tests:
- The KPI sample was recommended as a treemap of `actual`. `actual`/`target` and `low`/`high`(/`base`) are now treated as
  paired: once they form a target or range view they are not reused as free measures.
- A rank-change story was titled "Rising steadily: 9% up" because it described the pooled average of the teams. A
  non-additive measure (score, rate, price) is no longer pooled across series; the series view gets a new `rank-shift`
  finding ("Ada climbed from #3 to #1; the lead changed 1 time"). Additivity is now an explicit column property
  (`additive`), false for scores, rates, prices and levels.
- Bump chart period labels overlapped ("2024-01"); they are now "Jan" within a year and "Jan 24" across years.

Still open: the seasonal-overlay chart's "Current: +31.0" annotations assume values indexed to a baseline; with raw
values they read as change from the reference line. Worth a small option on the chart.
