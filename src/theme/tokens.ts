/**
 * The reference palette — ported from the dataviz skill's `references/palette.md`.
 * These are the only hex values in the whole library. Every chart resolves its
 * colors from here via `resolveTheme()`; nothing hardcodes a hex outside this file.
 *
 * To rebrand: edit the values below, then run `npm run validate-palette` — it
 * re-runs the same six checks (lightness band, chroma floor, CVD separation,
 * normal-vision floor, contrast) the reference palette was validated against.
 */

export type ThemeMode = "light" | "dark";

export interface ThemeTokens {
  /** Chart surface (the rect the marks sit on). */
  surface: string;
  /** Page-level ground behind the surface — used by chrome, not marks. */
  page: string;
  ink: {
    primary: string;
    secondary: string;
    muted: string;
  };
  grid: string;
  baseline: string;
  border: string;
  /** Fixed-order categorical slots. Never cycle past index 7 — fold to "Other" instead. */
  categorical: string[];
  /** Single-hue sequential ramp, step 100 (near-surface) -> 700 (saturated/dark). */
  sequential: Record<100 | 150 | 200 | 250 | 300 | 350 | 400 | 450 | 500 | 550 | 600 | 650 | 700, string>;
  diverging: {
    pos: string;
    posSoft: string;
    posSofter: string;
    mid: string;
    neg: string;
    negSoft: string;
    negSofter: string;
  };
  status: {
    good: string;
    warning: string;
    serious: string;
    critical: string;
  };
}

const light: ThemeTokens = {
  surface: "#fcfcfb",
  page: "#f9f9f7",
  ink: { primary: "#0b0b0b", secondary: "#52514e", muted: "#898781" },
  grid: "#e1e0d9",
  baseline: "#c3c2b7",
  border: "rgba(11,11,11,0.10)",
  categorical: [
    "#2a78d6", // 1 blue
    "#eb6834", // 2 orange
    "#1baf7a", // 3 aqua
    "#eda100", // 4 yellow
    "#e87ba4", // 5 magenta
    "#008300", // 6 green
    "#4a3aa7", // 7 violet
    "#e34948", // 8 red
  ],
  sequential: {
    100: "#cde2fb", 150: "#b7d3f6", 200: "#9ec5f4", 250: "#86b6ef",
    300: "#6da7ec", 350: "#5598e7", 400: "#3987e5", 450: "#2a78d6",
    500: "#256abf", 550: "#1c5cab", 600: "#184f95", 650: "#104281",
    700: "#0d366b",
  },
  diverging: {
    pos: "#256abf", posSoft: "#6da7ec", posSofter: "#b7d3f6",
    mid: "#f0efec",
    neg: "#c23837", negSoft: "#e9807e", negSofter: "#f6c9c8",
  },
  status: { good: "#0ca30c", warning: "#fab219", serious: "#ec835a", critical: "#d03b3b" },
};

const dark: ThemeTokens = {
  surface: "#1a1a19",
  page: "#0d0d0d",
  ink: { primary: "#ffffff", secondary: "#c3c2b7", muted: "#898781" },
  grid: "#2c2c2a",
  baseline: "#383835",
  border: "rgba(255,255,255,0.10)",
  categorical: [
    "#3987e5", "#d95926", "#199e70", "#c98500",
    "#d55181", "#008300", "#9085e9", "#e66767",
  ],
  // Sequential ramp is mode-general (validated against both surfaces) — same steps both modes.
  sequential: light.sequential,
  diverging: {
    pos: "#256abf", posSoft: "#6da7ec", posSofter: "#b7d3f6",
    mid: "#383835",
    neg: "#c23837", negSoft: "#e9807e", negSofter: "#f6c9c8",
  },
  // Status colors are fixed — never themed, same both modes.
  status: light.status,
};

export const THEMES: Record<ThemeMode, ThemeTokens> = { light, dark };

/** Resolve a mode ('light' | 'dark' | 'auto') to concrete tokens for this environment. */
export function resolveTheme(mode: ThemeMode | "auto" = "auto"): ThemeTokens {
  if (mode === "light" || mode === "dark") return THEMES[mode];
  const prefersDark =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? THEMES.dark : THEMES.light;
}

/** Subscribe to OS theme changes when mode is 'auto'. Returns an unsubscribe function. */
export function watchSystemTheme(cb: (tokens: ThemeTokens) => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => cb(mq.matches ? THEMES.dark : THEMES.light);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

/**
 * Categorical color for slot `i`, capped at the palette length. Past the cap,
 * callers should fold remaining series into "Other" or facet — never wrap
 * around to a repeated or interpolated hue.
 */
export function categoricalColor(tokens: ThemeTokens, i: number): string {
  if (i < 0 || i >= tokens.categorical.length) {
    throw new RangeError(
      `categoricalColor: slot ${i} is past the ${tokens.categorical.length}-color cap — fold into "Other" or facet instead of requesting another slot.`,
    );
  }
  return tokens.categorical[i];
}
