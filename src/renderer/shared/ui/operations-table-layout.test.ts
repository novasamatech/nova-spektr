import { describe, expect, it } from 'vitest';

import {
  COLUMN_DEFAULT_WIDTHS,
  COLUMN_FIT_WIDTHS,
  COLUMN_MAX_WIDTHS,
  COLUMN_MIN_WIDTHS,
  clampColumnWidth,
  getLeftBlockWidth,
  getOperationsMinWidth,
} from './operations-table-layout';

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
    for (const column of ['operation', 'value', 'submitter', 'initiator'] as const) {
      expect(COLUMN_FIT_WIDTHS[column]).toBeGreaterThanOrEqual(COLUMN_MIN_WIDTHS[column]);
      expect(COLUMN_FIT_WIDTHS[column]).toBeLessThanOrEqual(COLUMN_MAX_WIDTHS[column]);
    }
  });

  it('left block = operation + gap + value', () => {
    expect(getLeftBlockWidth(COLUMN_DEFAULT_WIDTHS)).toBe(240 + 8 + 140);
  });

  it('min width never drops below the 1372px window budget and grows with the columns', () => {
    expect(getOperationsMinWidth(COLUMN_DEFAULT_WIDTHS, { showInitiator: false })).toBe(1060);
    expect(getOperationsMinWidth({ ...COLUMN_DEFAULT_WIDTHS, submitter: 304 }, { showInitiator: false })).toBe(
      1060 + 124,
    );
  });

  it('counts the initiator column only while it is visible', () => {
    expect(getOperationsMinWidth(COLUMN_DEFAULT_WIDTHS, { showInitiator: true })).toBe(1060 + 180 + 8);
    expect(getOperationsMinWidth({ ...COLUMN_DEFAULT_WIDTHS, initiator: 304 }, { showInitiator: true })).toBe(
      1060 + 304 + 8,
    );
  });
});
