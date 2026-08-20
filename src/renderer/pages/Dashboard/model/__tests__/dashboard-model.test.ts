import { allSettled, fork } from 'effector';
import { afterEach, describe, expect, it } from 'vitest';

import { dashboardModel } from '../dashboard-model';

afterEach(() => localStorage.clear());

describe('dashboardModel.$widgetLayout', () => {
  it('sets a tab layout via layoutSet', async () => {
    const scope = fork();
    await allSettled(dashboardModel.layoutSet, {
      scope,
      params: { tab: 'overview', layout: { a: { x: 0, y: 0, w: 2, h: 2 } } },
    });

    expect(scope.getState(dashboardModel.$widgetLayout)).toEqual({
      overview: { a: { x: 0, y: 0, w: 2, h: 2 } },
    });
  });

  it('moves a widget and resolves collisions', async () => {
    const scope = fork({
      values: [
        [dashboardModel.$widgetLayout, { overview: { a: { x: 0, y: 0, w: 2, h: 2 }, b: { x: 2, y: 0, w: 2, h: 2 } } }],
      ],
    });

    await allSettled(dashboardModel.widgetMoved, {
      scope,
      params: { tab: 'overview', key: 'b', x: 0, y: 0 },
    });

    const layout = scope.getState(dashboardModel.$widgetLayout).overview!;
    expect(layout.b).toEqual({ x: 0, y: 0, w: 2, h: 2 });
    expect(layout.a).toEqual({ x: 0, y: 2, w: 2, h: 2 });
  });

  it('reset empties the tab layout', async () => {
    const scope = fork({
      values: [[dashboardModel.$widgetLayout, { overview: { a: { x: 0, y: 0, w: 2, h: 2 } } }]],
    });
    await allSettled(dashboardModel.layoutReset, { scope, params: { tab: 'overview' } });
    expect(scope.getState(dashboardModel.$widgetLayout).overview).toEqual({});
  });
});

describe('dashboardModel.$hiddenWidgets', () => {
  it('adds a key on widgetHidden', async () => {
    const scope = fork();
    await allSettled(dashboardModel.widgetHidden, {
      scope,
      params: { tab: 'overview', key: 'feature: dashboard/price-charts' },
    });

    expect(scope.getState(dashboardModel.$hiddenWidgets)).toEqual({
      overview: ['feature: dashboard/price-charts'],
    });
  });

  it('does not duplicate an already hidden key', async () => {
    const initial = { overview: ['a'] };
    const scope = fork({ values: [[dashboardModel.$hiddenWidgets, initial]] });
    await allSettled(dashboardModel.widgetHidden, { scope, params: { tab: 'overview', key: 'a' } });

    expect(scope.getState(dashboardModel.$hiddenWidgets)).toBe(initial);
  });

  it('removes the key on widgetRestored', async () => {
    const scope = fork({ values: [[dashboardModel.$hiddenWidgets, { overview: ['a', 'b'] }]] });
    await allSettled(dashboardModel.widgetRestored, { scope, params: { tab: 'overview', key: 'a' } });

    expect(scope.getState(dashboardModel.$hiddenWidgets)).toEqual({ overview: ['b'] });
  });

  it('layoutReset clears the hidden set of that tab only', async () => {
    const scope = fork({
      values: [[dashboardModel.$hiddenWidgets, { overview: ['a'], staking: ['b'] }]],
    });
    await allSettled(dashboardModel.layoutReset, { scope, params: { tab: 'overview' } });

    expect(scope.getState(dashboardModel.$hiddenWidgets)).toEqual({ overview: [], staking: ['b'] });
  });

  it('keeps state identity on no-op restore and reset', async () => {
    const initial = { overview: ['a'] };
    const scope = fork({ values: [[dashboardModel.$hiddenWidgets, initial]] });

    await allSettled(dashboardModel.widgetRestored, { scope, params: { tab: 'staking', key: 'x' } });
    await allSettled(dashboardModel.layoutReset, { scope, params: { tab: 'staking' } });

    expect(scope.getState(dashboardModel.$hiddenWidgets)).toBe(initial);
  });
});
