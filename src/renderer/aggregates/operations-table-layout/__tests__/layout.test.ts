import { describe, expect, it } from 'vitest';

import {
  COLUMN_DEFAULT_WIDTHS,
  COLUMN_FIT_WIDTHS,
  COLUMN_MAX_WIDTHS,
  COLUMN_MIN_WIDTHS,
  RESIZABLE_COLUMNS,
  TOGGLEABLE_COLUMNS,
  clampColumnWidth,
  getLeftBlockWidth,
  getOperationsMinWidth,
} from '../layout';

const ALL_VISIBLE = {
  value: true,
  submitter: true,
  initiator: true,
  description: true,
  status: true,
  actions: true,
};
const WITHOUT_INITIATOR = { ...ALL_VISIBLE, initiator: false };

describe('operations-table-layout', () => {
  it('clamps a width into the column range', () => {
    expect(clampColumnWidth('operation', 10)).toBe(COLUMN_MIN_WIDTHS.operation);
    expect(clampColumnWidth('operation', 10_000)).toBe(COLUMN_MAX_WIDTHS.operation);
    expect(clampColumnWidth('submitter', 200)).toBe(200);
  });

  it('rounds fractional drag deltas', () => {
    expect(clampColumnWidth('value', 150.6)).toBe(151);
  });

  it('fit widths sit inside the allowed range', () => {
    for (const column of RESIZABLE_COLUMNS) {
      expect(COLUMN_FIT_WIDTHS[column]).toBeGreaterThanOrEqual(COLUMN_MIN_WIDTHS[column]);
      expect(COLUMN_FIT_WIDTHS[column]).toBeLessThanOrEqual(COLUMN_MAX_WIDTHS[column]);
    }
  });

  it('left block = operation + gap + value, or operation alone when Value is off', () => {
    expect(getLeftBlockWidth(COLUMN_DEFAULT_WIDTHS, ALL_VISIBLE)).toBe(240 + 8 + 140);
    expect(getLeftBlockWidth(COLUMN_DEFAULT_WIDTHS, { ...ALL_VISIBLE, value: false })).toBe(240);
  });

  it('min width never drops below the 1372px window budget and grows with the columns', () => {
    expect(getOperationsMinWidth(COLUMN_DEFAULT_WIDTHS, WITHOUT_INITIATOR)).toBe(1060);
    expect(getOperationsMinWidth({ ...COLUMN_DEFAULT_WIDTHS, submitter: 304 }, WITHOUT_INITIATOR)).toBe(1060 + 124);
  });

  it('the trailing columns count towards the min width', () => {
    expect(getOperationsMinWidth({ ...COLUMN_DEFAULT_WIDTHS, actions: 208 }, WITHOUT_INITIATOR)).toBe(1060 + 40);
    expect(getOperationsMinWidth({ ...COLUMN_DEFAULT_WIDTHS, status: 150 }, WITHOUT_INITIATOR)).toBe(1060 + 40);
  });

  it('counts the initiator column only while it is visible', () => {
    expect(getOperationsMinWidth(COLUMN_DEFAULT_WIDTHS, ALL_VISIBLE)).toBe(1060 + 180 + 8);
    expect(getOperationsMinWidth({ ...COLUMN_DEFAULT_WIDTHS, initiator: 304 }, ALL_VISIBLE)).toBe(1060 + 304 + 8);
  });

  it('a hidden column stops counting towards the min width', () => {
    const wide = { ...COLUMN_DEFAULT_WIDTHS, submitter: 440 };
    const base = getOperationsMinWidth(wide, WITHOUT_INITIATOR);
    expect(base).toBe(1060 + 260);

    // Description contributes its 126px floor plus a gap, Actions its width plus a gap.
    expect(getOperationsMinWidth(wide, { ...WITHOUT_INITIATOR, description: false })).toBe(base - 126 - 8);
    expect(getOperationsMinWidth(wide, { ...WITHOUT_INITIATOR, actions: false })).toBe(base - 168 - 8);
    expect(getOperationsMinWidth(wide, { ...WITHOUT_INITIATOR, status: false })).toBe(base - 110 - 8);
    // Dropping the widened Submitter takes the row back under the floor.
    expect(getOperationsMinWidth(wide, { ...WITHOUT_INITIATOR, submitter: false })).toBe(1060);
  });

  it('every toggleable column is a real column key', () => {
    for (const column of TOGGLEABLE_COLUMNS) {
      if (column === 'description') continue;
      expect(RESIZABLE_COLUMNS).toContain(column);
    }
  });
});
