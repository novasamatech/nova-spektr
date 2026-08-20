import { TOOLTIP_CHROME_HEIGHT, TOOLTIP_INSET, TOOLTIP_ROW_STRIDE } from './constants';

/**
 * How many account rows the hover card can show inside a plot this tall.
 *
 * The card is inert to the pointer and the widget around it does not scroll, so
 * nothing the card cannot fit is reachable: the number of rows it _lists_ has
 * to be the number of rows it can _show_, or the "and N more" line under them
 * lies about how many were left out.
 *
 * Rounds down and always leaves room for that line, so the count errs towards
 * showing one row fewer than would fit — the honest direction. Never returns
 * zero: one row and a remainder still says more than an empty card.
 */
export const resolveVisibleAccountRows = (plotHeight: number): number => {
  const available = plotHeight - TOOLTIP_INSET - TOOLTIP_CHROME_HEIGHT;

  return Math.max(1, Math.floor(available / TOOLTIP_ROW_STRIDE));
};
