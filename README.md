# chart-atlas

Framework-agnostic, D3-native chart components for the forms that don't have
a good off-the-shelf library — bullet charts, dumbbell charts, ridgeline
plots, waffle charts, arc diagrams, slope charts, horizon charts, fan charts,
and others — all sharing one theme, one color system, and one mark-spec
language, so a page built from several of them reads as one design system
instead of a pile of unrelated screenshots.

This is a **vertical slice** (3 of ~28 planned charts) proving the
architecture, not a finished library. See [ROADMAP.md](./ROADMAP.md) for
what's built and what isn't yet.

## Why this exists

Most chart libraries cover the enterprise dashboard set well (bar, line,
scatter, box plot, treemap, sankey, choropleth — ECharts and Plotly.js both
do a good job here) but have no first-class support for the long-tail forms
data-journalism teams hand-build constantly: bullet charts, dumbbell charts,
ridgeline plots, waffle charts, arc diagrams, slope charts, horizon charts,
fan charts. Wrapping ECharts/Plotly for the covered forms and hand-building
the rest was considered and rejected — neither engine exposes enough control
to hit this library's mark spec (a real 2px gap between touching segments,
not a stroke; labels that only render if they fit; a fixed-order categorical
palette), so charts from different engines would never read as one system.
Everything here is native SVG on `d3-scale`/`d3-shape`/`d3-hierarchy`/
`d3-sankey` instead — smaller bundle, one visual language, no adapter drift.

## Install

```sh
npm install
npm run dev      # demo at http://localhost:5173, wired to real sample data
npm test         # palette + (growing) chart tests
npm run build    # emits dist/chart-atlas.{js,cjs} + type declarations
```

## Usage

```ts
import { bulletChart } from "chart-atlas";

const chart = bulletChart(document.getElementById("kpi")!, [
  { label: "Revenue $M", ranges: [40, 70], actual: 78, target: 85, max: 100 },
]);

// later:
chart.update(newData);           // re-render with new data
chart.update(data, { theme: "dark" }); // switch theme explicitly
chart.destroy();                 // tear down, always call this on unmount
```

Every chart factory returns the same `ChartInstance` shape —
`{ el, update(data, options?), resize(), destroy() }` — regardless of whether
it's a five-line scale-based render or a `d3-sankey` layout. Callers never
need to know which chart they're holding to manage its lifecycle.

## Theming

```ts
bulletChart(el, data, { theme: "light" | "dark" | "auto" });
```

`"auto"` (the default) follows `prefers-color-scheme` and updates live if the
OS setting changes. Colors are resolved in JS from `src/theme/tokens.ts` — no
CSS custom properties, no global stylesheet injection, so a chart looks right
regardless of the host page's own CSS.

To rebrand, edit `src/theme/tokens.ts` and run:

```sh
npm run validate-palette
```

This re-runs the same six computable checks (lightness band, chroma floor,
CVD separation, normal-vision floor, contrast vs. surface) the shipped palette
was validated against — `test/palette.test.ts` runs the same checks in CI, so
an unvalidated palette swap fails the build, not just a lint warning.

## Architecture

```
src/
  theme/tokens.ts     — the only hex values in the library; light/dark tokens,
                         categorical (fixed-order)/sequential/diverging/status
  core/
    types.ts           — ChartInstance, the interface every chart returns
    chart-root.ts       — shared setup: SVG root, resize + theme watching
    svg-utils.ts         — smoothPath, donutSegmentPath, polarPoint, label-fit estimate
    tooltip.ts            — one shared hover tooltip singleton per page
    legend.ts              — shared DOM legend (swatch + label), used for 2+ series
  charts/
    bullet.ts, treemap.ts, sankey.ts   — see ROADMAP.md for the rest
demo/
  index.html, main.ts  — real sample data, a light/dark toggle, one of each chart
```

Adding a new chart means: pick its data shape, call `createChartRoot`, write
the render closure, wire `update`/`resize`/`destroy` to it (every existing
chart is a template for this), and if the layout needs `d3-force`/`d3-chord`/
etc., add that one small D3 module as a dependency — never a general-purpose
charting engine.
