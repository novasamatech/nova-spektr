/**
 * Height of the plot area, in px. One constant on purpose: the skeleton and the
 * empty state occupy exactly this box so switching range/asset — or the data
 * arriving — never moves anything below the card.
 */
export const CHART_HEIGHT = 180;

/** Fixed width of the hover card, so its clamping needs no measurement. */
export const TOOLTIP_WIDTH = 264;

/** Past this many bars a value label above each bar stops being readable. */
export const LABEL_LIMIT = 13;
