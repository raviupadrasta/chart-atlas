# Roadmap

This is a **vertical slice**, not the finished library: three chart types built
to prove the architecture (shared theme, unified `ChartInstance` lifecycle,
resize/theme reactivity) actually holds up across three different rendering
patterns — a plain scale-based chart, a `d3-hierarchy` layout, and a `d3-sankey`
layout. Before adding more charts, that architecture should get used for a
while and adjusted if it's wrong.

## Built

| Chart | Pattern it proves |
|---|---|
| `bulletChart` | Plain `d3-scale`, no external layout module |
| `treemapChart` | `d3-hierarchy` (`treemap` + `treemapSquarify`), label-fit heuristic, categorical-cap folding |
| `sankeyChart` | `d3-sankey` layout, custom ribbon path (not d3-sankey's default stroked centerline) |

## Not built yet, in rough priority order

Grouped by which existing D3 module does the hard layout work — the estimate
is "wire up that module + write the mark-spec-compliant renderer around it,"
not "invent a layout algorithm."

**No layout module needed (same pattern as bullet):**
- [ ] `dumbbellChart` — two-point comparison per category
- [ ] `errorBarsChart` — point estimate + interval
- [ ] `slopeChart` — two-time-point comparison, status-color emphasis (good/bad)
- [ ] `waffleChart` — grid of unit squares by share
- [ ] `intervalBandChart` — trend line + confidence band
- [ ] `dotPlotChart` — ranked categories, point mark instead of bar

**`d3-array` bucketing / custom density, no dedicated module:**
- [ ] `boxplotChart`
- [ ] `violinChart` — needs a kernel-density estimate over the sample (there's no maintained density-estimate module; a small KDE helper needs writing once, then every distribution chart reuses it)
- [ ] `ridgelineChart` — reuses the violin KDE helper
- [ ] `beeswarmChart` — reuses `d3-force` — actually a `forceCollide` simulation is the standard non-overlapping-dot layout, not a hand jitter loop
- [ ] `horizonChart`
- [ ] `fanChart`

**`d3-hierarchy` (module already a dependency):**
- [ ] `sunburstChart` — `partition()`, arcs instead of rects
- [ ] `icicleChart` — same `partition()` data, rows instead of arcs (near-free once sunburst exists — same layout, different rendering)

**New D3 module per chart:**
- [ ] `chordChart` — `d3-chord`
- [ ] `networkChart` — `d3-force`
- [ ] `streamgraphChart` — `d3-shape`'s `stack` + `stackOffsetWiggle` (already implicitly available via d3-shape, no new dependency)
- [ ] `arcDiagramChart` — no dedicated module; positions are one-dimensional, arcs are plain quadratic beziers (closer to the bullet-chart pattern than a "real" layout)
- [ ] `calendarHeatmapChart` — `d3-time`/`d3-time-format` for week/day bucketing (new dependency)

**Correlation/multivariate (no layout module, just scales):**
- [ ] `scatterBubbleChart`
- [ ] `correlationHeatmapChart`
- [ ] `parallelCoordinatesChart`
- [ ] `splomChart`

**Geospatial — deliberately deferred, see below:**
- [ ] `choroplethChart` (abstract tiles, matching the original atlas — no `d3-geo`/topojson dependency yet)
- [ ] `proportionalSymbolMapChart` (abstract base)
- [ ] `hexbinMapChart` (`d3-hexbin` — new dependency; note this is a different "hexbin" than a chloropleth, it aggregates literal point coordinates)

## Deliberately deferred decisions

- **Real geography.** `choroplethChart` and `proportionalSymbolMapChart` stay
  on abstract/illustrative bases for now. Real topojson is a data-asset
  decision (which regions? bundled or bring-your-own?) worth making once an
  actual use case names the regions needed — see the design conversation this
  library came out of.
- **Animation/transitions.** `update()` currently re-renders synchronously;
  no interpolated transitions between data states. Worth adding once more
  than one chart type needs it, via `d3-transition` (not yet a dependency).
- **A KDE helper** (`src/core/density.ts`, not written yet) is shared
  infrastructure for violin + ridgeline — build it once, before either chart,
  not twice.
- **`src/core/legend.ts` is written but unused.** None of the three slice
  charts has 2+ series needing one, so it has zero test coverage and zero
  real usage — treat it as unverified scaffolding, not working
  infrastructure, until the first chart that needs a legend actually calls it.
