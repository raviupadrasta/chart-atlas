/**
 * A small, library-neutral description of a chart: axes plus a few layered
 * marks. `toSpec` builds one from a recommender mapping; each backend turns it
 * into Vega-Lite, Observable Plot, matplotlib or seaborn. Keeping it this
 * small is deliberate: every mark here can be expressed in all four targets.
 */
export type Target = "vega-lite" | "observable-plot" | "matplotlib" | "seaborn" | "plotly" | "echarts";
export const TARGETS: readonly Target[] = ["vega-lite", "observable-plot", "matplotlib", "seaborn", "plotly", "echarts"];

export type Tone = "accent" | "positive" | "negative" | "muted" | "ink" | "bandLight" | "bandMid" | "bandDark";

export interface Axis {
  title?: string;
  /** `category` axes list their values in `order` (first is nearest the origin, or at the top of a vertical axis). */
  kind: "linear" | "category";
  order?: string[];
  reverse?: boolean;
  /** Force the value axis to start at zero (true) or fit the data (false). Omitted: the target's default. */
  zero?: boolean;
  /** Label every n-th category only (n >= 2), so long period lists do not overprint. */
  tickEvery?: number;
  /** Whole-number ticks only (ranks). */
  integer?: boolean;
}

/** One record. Which fields a layer reads is fixed by its mark. */
export interface Datum {
  x?: number | string;
  y?: number | string;
  x0?: number;
  x1?: number;
  series?: string;
}

interface LayerBase {
  /** Fixed colour when the layer does not colour by series. */
  tone?: Tone;
}

export type Layer =
  /** x, y and optionally `series` (one line per series). */
  | (LayerBase & { mark: "line"; data: Datum[]; dash?: boolean; thick?: boolean; colorBySeries?: boolean })
  | (LayerBase & { mark: "point"; data: Datum[]; colorBySeries?: boolean })
  /** A horizontal bar from x0 to x1 at category y. */
  | (LayerBase & { mark: "range"; data: Datum[]; thin?: boolean })
  /** A vertical column from zero to y over the x interval [x0, x1] (a histogram bin). */
  | (LayerBase & { mark: "bin"; data: Datum[] })
  /** A vertical tick at x on category y (a target, a base case). */
  | (LayerBase & { mark: "tick"; data: Datum[] })
  /** A reference line across the plot. */
  | (LayerBase & { mark: "rule"; axis: "x" | "y"; value: number; dash?: boolean });

export interface ChartSpec {
  /** Catalog id of the chart this stands in for. */
  chart: string;
  title: string;
  /** Caveats and derivation notes, so an exported chart is as honest as the drawn one. */
  notes: string[];
  x: Axis;
  y: Axis;
  layers: Layer[];
  /** Approximate shape in pixels; backends treat it as a hint. */
  size: { width: number; height: number };
  /** Set when the target chart form does not exist in the library and a simpler one stands in. */
  approximation?: string;
  /** Set for a treemap: the parts, for targets that can draw one (ECharts). Others use `layers`. */
  treemap?: { name: string; value: number }[];
}
