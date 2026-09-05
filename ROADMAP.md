# Roadmap

The first three charts (bullet, treemap, sankey) were a **vertical slice**
proving the architecture (shared theme, unified `ChartInstance` lifecycle,
resize/theme reactivity) across three different rendering patterns — a plain
scale-based chart, a `d3-hierarchy` layout, and a `d3-sankey` layout. It held
up: the next 10 charts (the consulting-idiom set) reused that architecture
without changes to `core/`. Two more (seasonal overlay, radial-badge bar) came
from a pair of real dashboard charts a user pointed at directly — same result:
zero `core/` changes.

## Built

| Chart | Pattern it proves / reuses |
|---|---|
| `bulletChart` | Plain `d3-scale`, no external layout module |
| `treemapChart` | `d3-hierarchy` (`treemap` + `treemapSquarify`), label-fit heuristic, categorical-cap folding |
| `sankeyChart` | `d3-sankey` layout, custom ribbon path (not d3-sankey's default stroked centerline) |
| `waterfallChart` | Running-cumulative baseline; `d3-scale` only |
| `tornadoChart` | Sort-by-impact + status-color (good/critical) split around a base case |
| `footballFieldChart` | Floating range bars + optional reference line |
| `concentrationCurveChart` | `d3-array` `cumsum` for a Pareto/Lorenz-style cumulative curve |
| `marimekkoChart` | Reuses `TreemapNode`'s data shape and `foldToOther`/`sumValue` helpers; swaps `treemapSquarify` for `treemapSliceDice` — same `d3-hierarchy` dependency, different tiling |
| `costCurveChart` | `d3-array` `cumsum` for cumulative-width (MACC-style) bars |
| `bcgMatrixChart` | New shared `core/quadrant-scatter.ts` helper; log-scale + reversed x-axis |
| `impactEffortMatrixChart` | Same shared quadrant-scatter helper, linear axes — the reuse the two were designed together for |
| `bumpChart` | `scalePoint` + inverted-rank `scaleLinear`, no new dependency |
| `driverTreeChart` | First use of `d3-hierarchy`'s `tree()` (node-link box diagram, not an area/bar encoding) |
| `seasonalOverlayChart` | Best/worst/median computed FROM the data (not passed in) by comparing every series at the same index position the caller's "current" series has reached — only identity ("which series is current") is a caller annotation |
| `radialBadgeBarChart` | Two linked metrics per category with no second axis — a bar (status-bucketed by severity, relative to the set's own max) plus a `donutSegmentPath` progress ring (duration, relative to the set's own max) above it |

**Zero new npm dependencies** were needed for any of the 10 consulting
charts, or for the 2 charts after them — `scaleLog`/`scalePoint` (d3-scale),
`treemapSliceDice`/`tree()` (d3-hierarchy), and `cumsum` (d3-array) were
already installed, just unused until now; the seasonal-overlay and
radial-badge-bar charts needed nothing beyond `d3-scale` and the existing
`smoothPath`/`donutSegmentPath` primitives in `core/svg-utils.ts`.

**New shared infrastructure:** `src/core/quadrant-scatter.ts` —
`renderQuadrantScatter()`, a "2×2 bubble matrix" renderer shared by
`bcgMatrixChart` and `impactEffortMatrixChart`. It only knows pixel geometry
(divider lines, quadrant label positions); axis semantics (log vs. linear,
reversed vs. not, what each quadrant is *called*) stay in the two call sites.
A third quadrant-matrix chart should reuse this rather than reimplementing it.

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
- **`src/core/legend.ts` is written but still unused.** None of the 15 built
  charts has 2+ series needing a legend box yet (`bumpChart` gets away with
  direct end-labels since it only has a handful of series). Treat it as
  unverified scaffolding until the first chart that actually needs one calls it.
- **`driverTreeChart`'s box width is a text-length heuristic**
  (`estimateTextWidth`, the same conservative estimate `treemapChart` uses),
  not a measured `getBBox()`. Fine for short labels; a very long driver label
  could still look cramped. Worth revisiting if that comes up in practice.
- **`radialBadgeBarChart`'s ring sweep is capped at 0.97×360°**, never a true
  full circle. `donutSegmentPath`'s start/end points coincide at exactly 360°
  and the arc collapses to nothing — the cap trades an invisible "wrong"
  answer for a visible, correct-enough one at the top of the scale. Same
  reasoning applies to any future chart built on `donutSegmentPath` for a
  0-100%-style progress ring.
- **`radialBadgeBarChart`'s severity buckets and `seasonalOverlayChart`'s
  best/worst/median are both relative to the dataset passed in**, not fixed
  thresholds — a bar colored `status.critical` in one chart instance and one
  colored the same in another aren't necessarily comparable in absolute terms.
  Documented in each chart's own JSDoc; flagging here since it's easy to forget
  when skimming the "Built" table.
