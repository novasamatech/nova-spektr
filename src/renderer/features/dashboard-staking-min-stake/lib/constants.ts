import { type ChainId } from '@/shared/core';

/** Placeholder key for "no chain selected" — resolves to no api, hence no data. */
export const NO_CHAIN: ChainId = '0x00';

/**
 * Completed eras the KPI card's sparkline covers — its delta is against the
 * first.
 */
export const ERA_DEPTH = 7;

/** Height of the drill-down's plot box. */
export const CHART_HEIGHT = 220;

/** Above this many eras the per-era value labels would collide, so they go. */
export const MAX_LABELLED_ERAS = 12;

/** Above this many eras the per-era dots become noise on the step line. */
export const MAX_DOTTED_ERAS = 30;

/** How many x-axis labels the plot shows at most — the rest are thinned. */
export const MAX_AXIS_LABELS = 8;

/**
 * Share of the plot box the value scale occupies; the strip above it is
 * headroom for the per-era value labels, so the tallest step never collides
 * with its own label (132/158 in the approved frame).
 */
export const CHART_VALUE_SHARE = 132 / 158;

export const TOOLTIP_WIDTH = 232;

/** Gap between a step's dot and the value label above it, in px. */
export const VALUE_LABEL_OFFSET_PX = 9;

/** Date-fns pattern for era dates — the x labels and the hover card title. */
export const ERA_DATE_FORMAT = 'MMM d';

/** Date-fns pattern for the CSV — a spreadsheet needs the year, and ISO sorts. */
export const CSV_DATE_FORMAT = 'yyyy-MM-dd';

/**
 * Step-line palette. SVG strokes cannot read Tailwind classes, so the values
 * live here — every one references a theme token, so a theme change cannot
 * drift away from the widget.
 */
export const STEP_COLORS = {
  /** Completed eras — the muted accent tint. */
  line: 'var(--chart-accent-line)',
  /** Fill under the steps. */
  area: 'var(--chart-accent-area)',
  /** The active era's segment and dot. */
  accent: 'var(--icon-accent)',
  /** Fill of a completed era's dot — the dot sits on the card. */
  dotFill: 'var(--card-background)',
};
