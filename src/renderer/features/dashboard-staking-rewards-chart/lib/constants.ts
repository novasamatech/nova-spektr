/** Fixed width of the hover card, so its clamping needs no measurement. */
export const TOOLTIP_WIDTH = 264;

// The hover card's own measurements, in px. It has no cap on the number of
// accounts it lists — how many fit follows from the height of the plot it is
// bounded by (see `resolveVisibleAccountRows`), so a taller widget shows more of
// them. The three constants below are the parts of that arithmetic that CSS
// knows and JS does not, so they are read off the rendered card rather than
// guessed from the classes: `RewardsChartTooltip.stories.tsx` carries both the
// numbers last measured and the snippet that measures them again. Change the
// card's layout and these have to be re-measured, or the count of what was left
// out stops being true.

/** One account row. Measured: 20.0 (`h-5`, the 16px identicon sits inside it). */
export const TOOLTIP_ROW_HEIGHT = 20;

/** The gap between two rows — `gap-1.5`. There is none after the last one. */
export const TOOLTIP_ROW_GAP = 6;

/**
 * Everything in the card that is not an account row: `p-3` top and bottom, the
 * bucket title, the margins around the list, the "and N more" line, and the
 * total row with its border. Measured at 102.7 with the remainder line drawn
 * and rounded up, so the budget gives away a pixel rather than promising a row
 * it cannot show; a card that lists every account simply has room to spare.
 */
export const TOOLTIP_CHROME_HEIGHT = 104;

/**
 * The card's offset from the top of the plot (`top-1`), doubled so it clears
 * the bottom edge by as much as the top. Also the height the wrapper subtracts
 * from the plot, so the two never disagree.
 */
export const TOOLTIP_INSET = 8;
