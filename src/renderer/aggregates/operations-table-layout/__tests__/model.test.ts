import { allSettled, fork } from 'effector';
import { describe, expect, it } from 'vitest';

import {
  COLUMN_DEFAULT_WIDTHS,
  COLUMN_FIT_WIDTHS,
  COLUMN_MAX_WIDTHS,
  COLUMN_MIN_WIDTHS,
} from '@/shared/ui/operations-table-layout';
import { operationsTableLayoutModel, sanitizeColumnWidths } from '../model';

describe('operationsTableLayoutModel', () => {
  it('starts from the default widths', () => {
    const scope = fork();
    expect(scope.getState(operationsTableLayoutModel.$columnWidths)).toEqual(COLUMN_DEFAULT_WIDTHS);
    expect(scope.getState(operationsTableLayoutModel.$resizingColumn)).toBeNull();
  });

  it('clamps a resize into the column range', async () => {
    const scope = fork();
    await allSettled(operationsTableLayoutModel.columnResized, { scope, params: { column: 'submitter', width: 9999 } });
    expect(scope.getState(operationsTableLayoutModel.$columnWidths).submitter).toBe(COLUMN_MAX_WIDTHS.submitter);
  });

  it('autofit sets the fit width', async () => {
    const scope = fork();
    await allSettled(operationsTableLayoutModel.columnAutofit, { scope, params: 'submitter' });
    expect(scope.getState(operationsTableLayoutModel.$columnWidths).submitter).toBe(COLUMN_FIT_WIDTHS.submitter);
  });

  it('tracks the column being dragged', async () => {
    const scope = fork();
    await allSettled(operationsTableLayoutModel.resizeStarted, { scope, params: 'value' });
    expect(scope.getState(operationsTableLayoutModel.$resizingColumn)).toBe('value');
    await allSettled(operationsTableLayoutModel.resizeEnded, { scope });
    expect(scope.getState(operationsTableLayoutModel.$resizingColumn)).toBeNull();
  });
});

describe('sanitizeColumnWidths', () => {
  it('fills missing columns with defaults', () => {
    expect(sanitizeColumnWidths({ operation: 300 })).toEqual({ ...COLUMN_DEFAULT_WIDTHS, operation: 300 });
  });

  it('clamps out-of-range and drops non-numeric values', () => {
    expect(sanitizeColumnWidths({ operation: 9999, value: 'wide', submitter: NaN })).toEqual({
      ...COLUMN_DEFAULT_WIDTHS,
      operation: COLUMN_MAX_WIDTHS.operation,
    });
  });

  it('fills the status and actions columns added in a later build', () => {
    expect(sanitizeColumnWidths({ operation: 300 })).toMatchObject({
      status: COLUMN_DEFAULT_WIDTHS.status,
      actions: COLUMN_DEFAULT_WIDTHS.actions,
    });
    expect(sanitizeColumnWidths({ status: 9999, actions: 10 })).toMatchObject({
      status: COLUMN_MAX_WIDTHS.status,
      actions: COLUMN_MIN_WIDTHS.actions,
    });
  });

  it('falls back to defaults for non-object payloads', () => {
    expect(sanitizeColumnWidths(null)).toEqual(COLUMN_DEFAULT_WIDTHS);
    expect(sanitizeColumnWidths(5)).toEqual(COLUMN_DEFAULT_WIDTHS);
  });
});
