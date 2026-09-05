import { resolveTheme, watchSystemTheme, type ThemeMode, type ThemeTokens } from "../theme/tokens.js";

const SVG_NS = "http://www.w3.org/2000/svg";

export interface ChartRootHandle {
  svg: SVGSVGElement;
  /** Current theme tokens — re-resolved automatically while mode is 'auto'. */
  getTheme(): ThemeTokens;
  /** Set the SVG's design-space viewBox (chart coordinate system), e.g. setViewBox(300, 180). */
  setViewBox(width: number, height: number): void;
  /**
   * Switch theme mode after construction (e.g. an explicit `update({ theme: 'dark' })`).
   * Re-resolves tokens immediately and re-subscribes the OS watcher if the new
   * mode is 'auto'. Does nothing (beyond a no-op re-notify) if the mode is unchanged.
   */
  setThemeMode(mode: ThemeMode | "auto"): void;
  /**
   * Register a callback that fires on container resize and, when theme mode
   * is 'auto', on OS theme change. Charts use this to re-run their own render
   * closure — the base handles *when* to redraw, never *how*.
   */
  onInvalidate(cb: () => void): () => void;
  /** Tear down observers/listeners and clear the container. Idempotent. */
  destroy(): void;
}

/**
 * Shared setup every chart factory calls first: clears the container, creates
 * the SVG root, and wires up theme + resize watching. This is the one piece
 * of plumbing all 28 chart types share — everything after this is chart-specific.
 */
export function createChartRoot(
  container: HTMLElement,
  themeMode: ThemeMode | "auto" = "auto",
): ChartRootHandle {
  container.innerHTML = "";
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 300 180");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.style.width = "100%";
  svg.style.height = "auto";
  svg.style.display = "block";
  svg.style.overflow = "visible";
  container.appendChild(svg);

  let theme = resolveTheme(themeMode);
  let currentMode = themeMode;
  const callbacks = new Set<() => void>();
  const notify = () => callbacks.forEach((cb) => cb());

  let stopWatchingTheme = () => {};
  function subscribeIfAuto() {
    stopWatchingTheme();
    stopWatchingTheme =
      currentMode === "auto"
        ? watchSystemTheme((tokens) => {
            theme = tokens;
            notify();
          })
        : () => {};
  }
  subscribeIfAuto();

  const resizeObserver =
    typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => notify()) : undefined;
  resizeObserver?.observe(container);

  let destroyed = false;

  return {
    svg,
    getTheme: () => theme,
    setViewBox(width, height) {
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    },
    setThemeMode(mode) {
      // Deliberately does not call notify(): every call site is a chart's own
      // update(), which re-renders right after — notifying here would double-render.
      currentMode = mode;
      theme = resolveTheme(mode);
      subscribeIfAuto();
    },
    onInvalidate(cb) {
      callbacks.add(cb);
      return () => callbacks.delete(cb);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopWatchingTheme();
      resizeObserver?.disconnect();
      callbacks.clear();
      container.innerHTML = "";
    },
  };
}
