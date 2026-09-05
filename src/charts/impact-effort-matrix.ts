import { createChartRoot } from "../core/chart-root.js";
import { clear } from "../core/svg-utils.js";
import { renderQuadrantScatter, type QuadrantPoint } from "../core/quadrant-scatter.js";
import type { BaseChartOptions, ChartInstance } from "../core/types.js";

export interface InitiativePoint {
  label: string;
  /** 0-10 (or any consistent scale) — how much this initiative moves the outcome. */
  impact: number;
  /** 0-10 — how hard this initiative is to execute. */
  effort: number;
  /** Optional size measure (e.g. expected value) — sets bubble area. Uniform dot if omitted. */
  size?: number;
  colorIndex?: 0 | 1 | 2;
}

export type ImpactEffortData = InitiativePoint[];

export interface ImpactEffortMatrixOptions extends BaseChartOptions {
  height?: number;
  /** Impact/effort domain — same for both axes by default. Default [0, 10]. */
  domain?: [number, number];
}

const WIDTH = 300;

/**
 * The workhorse of every transformation/PMO prioritization slide: plot every
 * initiative by impact vs. effort, then sequence Quick Wins before Major
 * Projects and deprioritize the rest. Shares its rendering with bcgMatrixChart
 * (same "2x2 bubble matrix" shape) — just linear axes instead of log, and no
 * axis reversal.
 */
export function impactEffortMatrixChart(
  container: HTMLElement,
  data: ImpactEffortData,
  options: ImpactEffortMatrixOptions = {},
): ChartInstance<ImpactEffortData, ImpactEffortMatrixOptions> {
  const root = createChartRoot(container, options.theme);
  let currentData = data;
  let currentOptions = options;
  const cleanups: Array<() => void> = [];

  function render() {
    cleanups.splice(0).forEach((fn) => fn());
    const theme = root.getTheme();
    const height = currentOptions.height ?? 200;
    root.setViewBox(WIDTH, height);
    clear(root.svg);

    const domain = currentOptions.domain ?? [0, 10];
    const points: QuadrantPoint[] = currentData.map((d) => ({
      label: d.label,
      x: d.effort,
      y: d.impact,
      size: d.size,
      colorIndex: d.colorIndex,
    }));

    renderQuadrantScatter(
      root.svg,
      theme,
      points,
      {
        width: WIDTH,
        height,
        xDomain: domain,
        yDomain: domain,
        xLabel: "effort →",
        yLabel: "impact →",
        quadrantLabels: {
          topLeft: "Quick Wins",
          topRight: "Major Projects",
          bottomLeft: "Fill-Ins",
          bottomRight: "Reconsider",
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
