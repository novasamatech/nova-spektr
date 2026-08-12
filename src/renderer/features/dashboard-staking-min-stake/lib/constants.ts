/** Completed eras drawn before the active one. */
export const ERA_DEPTH = 7;

/** The plot box never shrinks below the design's 158px. */
export const CHART_MIN_HEIGHT = 158;

/**
 * Share of the plot box the value scale occupies; the strip above it is
 * headroom for the per-era value labels, so the tallest step never collides
 * with its own label (132/158 in the approved frame).
 */
export const CHART_VALUE_SHARE = 132 / 158;

export const TOOLTIP_WIDTH = 232;

/**
 * Step-line palette. The accent is the app's `--icon-accent`; SVG strokes
 * cannot read Tailwind classes, so the values live here.
 */
export const STEP_COLORS = {
  /** Completed eras. */
  line: '#8f92fa',
  /** Fill under the steps. */
  area: '#e1e2fe',
  /** The active era's segment and dot. */
  accent: '#4649f6',
};
