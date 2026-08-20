import { describe, expect, it } from 'vitest';

import { TOOLTIP_CHROME_HEIGHT, TOOLTIP_INSET, TOOLTIP_ROW_GAP, TOOLTIP_ROW_HEIGHT } from '../constants';
import { resolveVisibleAccountRows } from '../tooltip';

/** The exact height a card with `rows` rows occupies inside its plot. */
const heightFor = (rows: number) =>
  TOOLTIP_INSET + TOOLTIP_CHROME_HEIGHT + rows * TOOLTIP_ROW_HEIGHT + (rows - 1) * TOOLTIP_ROW_GAP;

describe('resolveVisibleAccountRows', () => {
  it('grows with the plot — a taller widget lists more accounts', () => {
    expect(resolveVisibleAccountRows(heightFor(4))).toBe(4);
    expect(resolveVisibleAccountRows(heightFor(12))).toBe(12);
  });

  it('fills the plot it is given: a height that fits n rows exactly lists n', () => {
    for (const rows of [2, 5, 9, 19]) {
      expect(resolveVisibleAccountRows(heightFor(rows))).toBe(rows);
    }
  });

  it('rounds down, so a partly visible row is never counted as listed', () => {
    expect(resolveVisibleAccountRows(heightFor(4) + TOOLTIP_ROW_HEIGHT + TOOLTIP_ROW_GAP - 1)).toBe(4);
  });

  it('keeps one row even where nothing fits', () => {
    expect(resolveVisibleAccountRows(0)).toBe(1);
    expect(resolveVisibleAccountRows(TOOLTIP_CHROME_HEIGHT)).toBe(1);
  });

  it('lists a single row at the widget minimum', () => {
    // A three-row widget leaves the plot 157px (see the feature's minSize). The
    // value is pinned because the whole point of deriving it is that it matches
    // what the card can show: measured against the real card, a second row is
    // clipped at this height.
    expect(resolveVisibleAccountRows(157)).toBe(1);
  });
});
