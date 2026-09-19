# What's next

State at the pause (2026-09-19): profiler, catalog, recommender, `recommendAndRender`, and
`recommendAndExport` (six plotting libraries, one shared style) are built and tested (242 tests, type
check clean). Everything below is not started unless noted.

## 1. "Focus versus peers" chart (agreed, next up)
One highlighted series over a band summarising many others, plus a rank panel. Motivating case: one
fund's rolling returns among 45 peers. Picture: `docs/images/rolling-returns-sample.png` (synthetic data).
- **Chart:** Fund A as a bold line over grey bands (min to max, 25th to 75th percentile) and a median
  line; second panel with Fund A's percentile rank over time and shaded top and bottom quartiles.
- **Band includes the focus series** (all 46 funds), labelled "All 46 funds, including Fund A". Keep an
  option to exclude it for a strict "versus the rest" comparison. Decision reason: matches the usual
  "rank 12 of 46" convention and keeps both panels describing the same group.
- **Rules to state on the chart:** one rolling window per chart (in the title), same dates and frequency
  for every fund, same return basis (after fees), like-for-like peer group, and a caption when funds
  closed or merged (survivorship).
- **Where it plugs in:** catalog entry, profiler view kind for "one focus series among many peers"
  (today `bump` caps at 8 series, so 46 series fall back to it wrongly), mapper in `src/recommend/map.ts`,
  a spec in `src/export/to-spec.ts` (needs a new `band` mark: `y0`/`y1` per x), and all six emitters.
- **Also:** a distribution view (box plot or ridgeline of peers at 1, 3 and 5 years, Fund A as a dot).

## 2. Export
- Add the `band` mark to the shared spec and the six emitters (needed by item 1); check Plotly
  (`fill="tonexty"`), ECharts (stacked areas), Vega-Lite (`area` with `y`/`y2`), Plot (`areaY`).
- Export the other 8 charts (waterfall, sankey, marimekko, cost curve, BCG, impact/effort, driver tree,
  radial badge bar) or say clearly which targets cannot draw them.
- Known small differences: Observable Plot title is HTML around the SVG; ECharts rank axis has an
  empty padding step; Vega-Lite and ECharts size their own plot areas.
- Publish the export package pieces: Python targets need `matplotlib`, `pandas`, `seaborn` or `plotly`;
  say so in the docs (done in README) and consider a `requirements.txt` for the examples.
- Add a CLI (`chart-atlas export data.csv --target plotly`) so people without TypeScript can use it.

## 3. Recommender and profiler
- Baseline charts (bar, line, scatter, histogram, ECDF): the recommender already reports them as gaps;
  once mapped, they export to all six libraries with little extra work.
- Profiler gaps: hierarchy, flow and paired-data structure detection (`docs/insight-taxonomy.md` s14).
- Tune recommender weights against golden tests; lie-factor defects 3 to 6 are pinned as expected failures.
- Seasonal overlay annotations with raw values.

## 4. Skill and packaging
- Claude skill that frames the insight and writes the rationale from the profiler and recommender output.
- License, npm package, docs site, copy-in registry/CLI (later, not the core).

## Housekeeping
- Work is on the `recommender` branch (not yet merged to `main`). There was no git remote configured when
  this file was written, so nothing has been pushed anywhere yet.
- Scratch tooling used to check exports (Python venv, vega and Plot renderers, headless Chrome) lives
  outside the repo; a small script that renders every export target would be a good addition under `scripts/`.
