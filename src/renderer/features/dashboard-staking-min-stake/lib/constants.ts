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

/** Date-fns pattern for era dates — the x labels and the hover card title. */
export const ERA_DATE_FORMAT = 'MMM d';

/**
 * Step-line palette. SVG strokes cannot read Tailwind classes, so the values
 * live here; the theme-owned ones reference their CSS tokens so a theme change
 * cannot drift away from the widget.
 */
export const STEP_COLORS = {
  /** Completed eras — a fixed tint of the accent, no token exists for it. */
  line: '#8f92fa',
  /** Fill under the steps — same fixed tint family. */
  area: '#e1e2fe',
  /** The active era's segment and dot. */
  accent: 'var(--icon-accent)',
  /** Fill of a completed era's dot — the dot sits on the card. */
  dotFill: 'var(--card-background)',
};
