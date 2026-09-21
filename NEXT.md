# What's next

State (2026-09-21): profiler, catalog, recommender, `recommendAndRender`, `recommendAndExport` (six
plotting libraries, one shared style) and the five baseline charts (bar, line, scatter, histogram, ECDF)
are built and tested (295 tests, type check and build clean). Everything below is not started unless noted.

## 1. Export
- Export the other 8 charts (waterfall, sankey, marimekko, cost curve, BCG, impact/effort, driver tree,
  radial badge bar) or say clearly which targets cannot draw them.
- Known small differences: Observable Plot title is HTML around the SVG; ECharts rank axis has an
  empty padding step; Vega-Lite and ECharts size their own plot areas.
- Publish the export package pieces: Python targets need `matplotlib`, `pandas`, `seaborn` or `plotly`;
  say so in the docs (done in README) and consider a `requirements.txt` for the examples.
- Add a CLI (`chart-atlas export data.csv --target plotly`) so people without TypeScript can use it.

## 2. Recommender and profiler
- Baseline charts are built (2026-09-21) and export to all six targets (new `bin` mark for histograms, `tickEvery`
  axis option for long category axes). Follow-ups: charts can now declare `showsFindings` (seasonal overlay does, for
  `seasonality`) so a specialist chart is not buried by a general one; do the same for other specialist charts when the
  profiler learns to emit their findings. Most specialist charts (sankey, waterfall, marimekko, cost curve, BCG,
  impact/effort, driver tree, radial badge bar, tornado) still never win because the profiler emits no flow, bridge,
  hierarchy or 2x2 structure for them: that is the profiler-gaps item below, and `test/recommend.test.ts` has a
  reachability test to extend as each becomes reachable. Also: bar for time-ordered categories; a log axis for `spansOrders` distributions. Note the `baseline-needed` answer
  path is unreachable for now (`src/catalog/planned.ts` is empty) and has no test until a planned chart is added again.
- Known limits of the new charts: line caps at 5 series (with a note; more means bump or small multiples), the
  export joins a missing period with a straight line (the drawn chart leaves a gap; a note says so), and the
  histogram export uses the same equal-width bins as the drawn one.
- Profiler gaps: hierarchy, flow and paired-data structure detection (`docs/insight-taxonomy.md` s14).
- Tune recommender weights against golden tests; lie-factor defects 3 to 6 are pinned as expected failures.
- Seasonal overlay annotations with raw values.

## 3. Skill and packaging
- Claude skill that frames the insight and writes the rationale from the profiler and recommender output.
- License, npm package, docs site, copy-in registry/CLI (later, not the core).

## Housekeeping
- `origin` is https://github.com/raviupadrasta/chart-atlas. History is one straight line; `main` trails `recommender`
  and can fast-forward to it.
- Scratch tooling used to check exports (Python venv, vega and Plot renderers, headless Chrome) lives
  outside the repo; a small script that renders every export target would be a good addition under `scripts/`.
