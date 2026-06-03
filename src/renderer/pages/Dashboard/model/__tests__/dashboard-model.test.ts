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
});
