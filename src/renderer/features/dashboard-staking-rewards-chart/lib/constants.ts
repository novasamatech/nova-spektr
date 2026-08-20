/** Fixed width of the hover card, so its clamping needs no measurement. */
export const TOOLTIP_WIDTH = 264;

// The hover card's own measurements, in px. It has no cap on the number of
// accounts it lists — how many fit follows from the height of the plot it is
// bounded by (see `resolveVisibleAccountRows`), so a taller widget shows more of
// them. The three constants below are the parts of that arithmetic that CSS
// knows and JS does not: they are read off the card's layout, and moving that
// layout means moving these.

/** One account row plus the gap under it: `h-5` text and `gap-1.5`. */
export const TOOLTIP_ROW_STRIDE = 26;

/**
 * Everything in the card that is not an account row: `p-3` top and bottom, the
 * bucket title, the margins around the list, the "and N more" line, and the
 * total row with its border. Counted whether or not the remainder line is
 * drawn, so a card that ends up listing every account simply has room to
 * spare.
 */
export const TOOLTIP_CHROME_HEIGHT = 104;

/** The card's offset from the top of the plot (`top-1`), doubled for symmetry. */
export const TOOLTIP_INSET = 8;
