import { describe, expect, it } from 'vitest';

import { TOOLTIP_CHROME_HEIGHT, TOOLTIP_INSET, TOOLTIP_ROW_STRIDE } from '../constants';
import { resolveVisibleAccountRows } from '../tooltip';

const heightFor = (rows: number) => TOOLTIP_INSET + TOOLTIP_CHROME_HEIGHT + rows * TOOLTIP_ROW_STRIDE;

describe('resolveVisibleAccountRows', () => {
  it('grows with the plot — a taller widget lists more accounts', () => {
    expect(resolveVisibleAccountRows(heightFor(4))).toBe(4);
    expect(resolveVisibleAccountRows(heightFor(12))).toBe(12);
  });

  it('rounds down, so a partly visible row is never counted as listed', () => {
    expect(resolveVisibleAccountRows(heightFor(4) + TOOLTIP_ROW_STRIDE - 1)).toBe(4);
  });

  it('keeps one row even where nothing fits', () => {
    expect(resolveVisibleAccountRows(0)).toBe(1);
    expect(resolveVisibleAccountRows(TOOLTIP_CHROME_HEIGHT)).toBe(1);
  });

  it('leaves the plot at the widget minimum with room for a row and a remainder', () => {
    // A three-row widget leaves the plot ~157px; see the feature's minSize.
    expect(resolveVisibleAccountRows(157)).toBeGreaterThanOrEqual(1);
    expect(resolveVisibleAccountRows(157)).toBeLessThanOrEqual(2);
  });
});
