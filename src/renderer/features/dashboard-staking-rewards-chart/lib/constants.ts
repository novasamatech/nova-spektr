/** Fixed width of the hover card, so its clamping needs no measurement. */
export const TOOLTIP_WIDTH = 264;

/**
 * How many account rows the hover card lists before it summarises the rest. The
 * card is bounded by the plot it hovers over — a widget at its minimum height
 * leaves it about 150px — and rows are ordered largest first, so the ones past
 * this count are the ones worth least. The remainder is named in a line of its
 * own rather than dropped silently.
 */
export const TOOLTIP_MAX_ACCOUNTS = 6;
