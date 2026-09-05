import type { ThemeMode } from "../theme/tokens.js";

/** Options every chart accepts, regardless of type. Chart-specific option types extend this. */
export interface BaseChartOptions {
  /** 'light' | 'dark' | 'auto' (default). 'auto' follows the OS/browser setting and updates live. */
  theme?: ThemeMode | "auto";
  /** Intrinsic aspect ratio (width / height) the chart lays itself out at before container resize. */
  aspectRatio?: number;
}

/**
 * The interface every chart in the library returns, whether it's a five-line
 * scale-based chart or a d3-sankey layout. This is the one thing that makes
 * the library "unified" — callers never need to know which chart they're
 * holding to update it, resize it, or tear it down.
 */
export interface ChartInstance<TData, TOptions extends BaseChartOptions = BaseChartOptions> {
  /** The root element the chart rendered into (the container you passed in). */
  readonly el: HTMLElement;
  /** Re-render with new data and/or a partial options patch. */
  update(data: TData, options?: Partial<TOptions>): void;
  /** Re-measure the container and redraw at the new size. Called automatically on container resize. */
  resize(): void;
  /** Remove all DOM the chart created and stop watching theme/resize. Always call this on teardown. */
  destroy(): void;
}

export type ChartFactory<TData, TOptions extends BaseChartOptions = BaseChartOptions> = (
  container: HTMLElement,
  data: TData,
  options?: TOptions,
) => ChartInstance<TData, TOptions>;
