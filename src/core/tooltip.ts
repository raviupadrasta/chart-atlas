import type { ThemeTokens } from "../theme/tokens.js";

let sharedTooltip: HTMLDivElement | undefined;

/**
 * One tooltip div shared across every chart instance on the page (matches how
 * a real page works — the reader never has two tooltips open at once). Created
 * lazily on first use, styled inline so the library needs no host stylesheet.
 */
function getSharedTooltip(): HTMLDivElement {
  if (sharedTooltip) return sharedTooltip;
  const div = document.createElement("div");
  div.setAttribute("role", "tooltip");
  Object.assign(div.style, {
    position: "fixed",
    pointerEvents: "none",
    zIndex: "2147483647",
    padding: "5px 8px",
    borderRadius: "5px",
    fontSize: "12px",
    fontFamily: "ui-monospace, 'IBM Plex Mono', monospace",
    whiteSpace: "nowrap",
    opacity: "0",
    transition: "opacity 80ms",
    transform: "translate(-50%, -130%)",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(div);
  sharedTooltip = div;
  return div;
}

/**
 * Attach a hover tooltip to one SVG element (the "per-mark hover" layer the
 * mark-spec calls for on bar/dot/cell marks). `label` can be a fixed string or
 * a function so it can read live data at hover time.
 */
export function bindTooltip(
  el: SVGElement,
  label: string | (() => string),
  theme: ThemeTokens,
): () => void {
  const tip = getSharedTooltip();
  const onMove = (e: MouseEvent) => {
    tip.textContent = typeof label === "function" ? label() : label;
    tip.style.background = theme.ink.primary;
    tip.style.color = theme.surface;
    tip.style.left = `${e.clientX}px`;
    tip.style.top = `${e.clientY}px`;
    tip.style.opacity = "1";
  };
  const onLeave = () => {
    tip.style.opacity = "0";
  };
  el.addEventListener("mousemove", onMove);
  el.addEventListener("mouseleave", onLeave);
  return () => {
    el.removeEventListener("mousemove", onMove);
    el.removeEventListener("mouseleave", onLeave);
    tip.style.opacity = "0";
  };
}
