import { allSettled, fork } from 'effector';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { COLUMN_DEFAULT_WIDTHS, COLUMN_FIT_WIDTHS, COLUMN_MAX_WIDTHS, COLUMN_MIN_WIDTHS } from '../layout';
import {
  COLUMN_VISIBILITY_STORAGE_KEY,
  COLUMN_WIDTHS_STORAGE_KEY,
  operationsTableLayoutModel,
  sanitizeColumnVisibility,
  sanitizeColumnWidths,
} from '../model';

describe('operationsTableLayoutModel', () => {
  it('starts from the default widths', () => {
    const scope = fork();
    expect(scope.getState(operationsTableLayoutModel.$columnWidths)).toEqual(COLUMN_DEFAULT_WIDTHS);
    expect(scope.getState(operationsTableLayoutModel.$isResizing)).toBe(false);
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

  it('records a visibility decision as an override', async () => {
    const scope = fork();
    expect(scope.getState(operationsTableLayoutModel.$visibilityOverrides)).toEqual({});

    await allSettled(operationsTableLayoutModel.columnVisibilityChanged, {
      scope,
      params: { column: 'submitter', visible: false },
    });
    expect(scope.getState(operationsTableLayoutModel.$visibilityOverrides)).toEqual({ submitter: false });
  });

  it('reset returns both the widths and the visibility to defaults', async () => {
    const scope = fork();
    await allSettled(operationsTableLayoutModel.columnResized, { scope, params: { column: 'submitter', width: 400 } });
    await allSettled(operationsTableLayoutModel.columnVisibilityChanged, {
      scope,
      params: { column: 'initiator', visible: true },
    });

    await allSettled(operationsTableLayoutModel.layoutReset, { scope });

    expect(scope.getState(operationsTableLayoutModel.$columnWidths)).toEqual(COLUMN_DEFAULT_WIDTHS);
    expect(scope.getState(operationsTableLayoutModel.$visibilityOverrides)).toEqual({});
  });

  it('flags a drag for as long as it lasts', async () => {
    const scope = fork();
    await allSettled(operationsTableLayoutModel.resizeStarted, { scope });
    expect(scope.getState(operationsTableLayoutModel.$isResizing)).toBe(true);
    await allSettled(operationsTableLayoutModel.resizeEnded, { scope });
    expect(scope.getState(operationsTableLayoutModel.$isResizing)).toBe(false);
  });
});

describe('operationsTableLayoutModel hydration', () => {
  // The model hydrates from local storage at module load, so every case seeds
  // storage first and then imports a fresh copy of the module. A fork would start
  // from the store defaults, so the hydrated root state is read directly.
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it('keeps the defaults when the stored payloads are not JSON', async () => {
    localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, '{not json');
    localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, 'nope');

    const { operationsTableLayoutModel: model } = await import('../model');

    // eslint-disable-next-line effector/no-getState
    expect(model.$columnWidths.getState()).toEqual(COLUMN_DEFAULT_WIDTHS);
    // eslint-disable-next-line effector/no-getState
    expect(model.$visibilityOverrides.getState()).toEqual({});
  });

  it('merges a stored payload over the defaults and clamps it', async () => {
    localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify({ operation: 9999, value: 'wide' }));
    localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify({ initiator: true, value: 'yes' }));

    const { operationsTableLayoutModel: model } = await import('../model');

    // eslint-disable-next-line effector/no-getState
    expect(model.$columnWidths.getState()).toEqual({
      ...COLUMN_DEFAULT_WIDTHS,
      operation: COLUMN_MAX_WIDTHS.operation,
    });
    // eslint-disable-next-line effector/no-getState
    expect(model.$visibilityOverrides.getState()).toEqual({ initiator: true });
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

describe('sanitizeColumnVisibility', () => {
  it('keeps only known columns carrying a boolean', () => {
    expect(sanitizeColumnVisibility({ submitter: false, initiator: true, operation: false, value: 'yes' })).toEqual({
      submitter: false,
      initiator: true,
    });
  });

  it('falls back to no overrides for non-object payloads', () => {
    expect(sanitizeColumnVisibility(null)).toEqual({});
    expect(sanitizeColumnVisibility('all')).toEqual({});
  });
});
