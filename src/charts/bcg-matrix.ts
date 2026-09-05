import { createChartRoot } from "../core/chart-root.js";
import { clear } from "../core/svg-utils.js";
import { renderQuadrantScatter, type QuadrantPoint } from "../core/quadrant-scatter.js";
import type { BaseChartOptions, ChartInstance } from "../core/types.js";

export interface BcgMatrixUnit {
  label: string;
  /** Relative market share vs. the largest competitor (1.0 = tied for #1). Plotted log-scale, high share on the left — the BCG convention. */
  relativeShare: number;
  /** Market growth rate, e.g. as a percentage. */
  marketGrowth: number;
  /** Revenue or another size measure — sets bubble area. */
  revenue: number;
  colorIndex?: 0 | 1 | 2;
}

export type BcgMatrixData = BcgMatrixUnit[];

export interface BcgMatrixOptions extends BaseChartOptions {
  height?: number;
  /** Relative-share domain, log-scaled. Default [0.1, 10]. */
  shareDomain?: [number, number];
  /** Growth-rate domain. Default: data extent padded 20%. */
  growthDomain?: [number, number];
  /** Where the growth divider sits. Default: domain midpoint. */
  growthThreshold?: number;
}

const WIDTH = 320;

/**
 * The single most famous chart in strategy consulting: relative market share
 * (log scale, high share conventionally on the LEFT) against market growth,
 * bubble size = revenue. Which quadrant a business unit falls in — Star, Cash
 * Cow, Question Mark, Dog — is literally the analysis.
 */
export function bcgMatrixChart(
  container: HTMLElement,
  data: BcgMatrixData,
  options: BcgMatrixOptions = {},
): ChartInstance<BcgMatrixData, BcgMatrixOptions> {
  const root = createChartRoot(container, options.theme);
  let currentData = data;
  let currentOptions = options;
  const cleanups: Array<() => void> = [];

  function render() {
    cleanups.splice(0).forEach((fn) => fn());
    const theme = root.getTheme();
    const height = currentOptions.height ?? 220;
    root.setViewBox(WIDTH, height);
    clear(root.svg);

    const growth = currentData.map((d) => d.marketGrowth);
    const growthDomain: [number, number] = currentOptions.growthDomain ?? [
      Math.min(0, ...growth) * 1.0,
      Math.max(...growth, 1) * 1.2,
    ];

    const points: QuadrantPoint[] = currentData.map((d) => ({
      label: d.label,
      x: d.relativeShare,
      y: d.marketGrowth,
      size: d.revenue,
      colorIndex: d.colorIndex,
    }));

    renderQuadrantScatter(
      root.svg,
      theme,
      points,
      {
        width: WIDTH,
        height,
        xDomain: currentOptions.shareDomain ?? [0.1, 10],
        yDomain: growthDomain,
        xScaleType: "log",
        reverseX: true,
        xLabel: "relative market share →",
        yLabel: "market growth →",
        xThreshold: 1,
        yThreshold: currentOptions.growthThreshold,
        quadrantLabels: {
          topLeft: "Stars",
          topRight: "Question Marks",
          bottomLeft: "Cash Cows",
          bottomRight: "Dogs",
        },
      },
      cleanups,
    );
  }

  const unwatch = root.onInvalidate(render);
  render();

  return {
    el: container,
    update(nextData, nextOptions) {
      currentData = nextData;
      currentOptions = { ...currentOptions, ...nextOptions };
      if (nextOptions?.theme) root.setThemeMode(nextOptions.theme);
      render();
    },
    resize: render,
    destroy() {
      cleanups.splice(0).forEach((fn) => fn());
      unwatch();
      root.destroy();
    },
  };
}
