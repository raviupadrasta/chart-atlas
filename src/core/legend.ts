import type { ThemeTokens } from "../theme/tokens.js";

export interface LegendItem {
  label: string;
  color: string;
}

/**
 * The dependable identity channel: "a legend is always present for two or
 * more series ... never make the reader rely on color-matching alone." A
 * single series gets no box — the title already says what's plotted, so
 * callers simply don't call this when `items.length < 2`.
 *
 * Rendered as HTML (not SVG) sibling to the chart's `<svg>`, appended into the
 * same container, so it wraps and reflows like normal text at any width.
 */
export function renderLegend(container: HTMLElement, items: LegendItem[], theme: ThemeTokens): HTMLDivElement {
  const el = document.createElement("div");
  Object.assign(el.style, {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px 16px",
    marginTop: "8px",
    fontSize: "12px",
    fontFamily: "system-ui, sans-serif",
    color: theme.ink.secondary,
  } satisfies Partial<CSSStyleDeclaration>);

  for (const item of items) {
    const row = document.createElement("span");
    Object.assign(row.style, { display: "inline-flex", alignItems: "center", gap: "6px" });
    const swatch = document.createElement("span");
    Object.assign(swatch.style, {
      width: "10px",
      height: "10px",
      borderRadius: "2px",
      background: item.color,
      flex: "none",
    } satisfies Partial<CSSStyleDeclaration>);
    const text = document.createElement("span");
    text.textContent = item.label;
    row.append(swatch, text);
    el.append(row);
  }

  container.appendChild(el);
  return el;
}
