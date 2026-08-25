import { afterEach, describe, expect, it } from 'vitest';

import { readLegacyOrder } from '../legacy-order';

afterEach(() => localStorage.clear());

describe('readLegacyOrder', () => {
  it('returns the saved order for a tab', () => {
    localStorage.setItem('dashboard-widget-order', JSON.stringify({ overview: ['a', 'b'] }));
    expect(readLegacyOrder('overview')).toEqual(['a', 'b']);
  });

  it('returns an empty array when absent or malformed', () => {
    expect(readLegacyOrder('overview')).toEqual([]);
    localStorage.setItem('dashboard-widget-order', '{bad json');
    expect(readLegacyOrder('overview')).toEqual([]);
  });

  it('expands split widgets in place of the old key', () => {
    localStorage.setItem(
      'dashboard-widget-order',
      JSON.stringify({ staking: ['a', 'feature: dashboard/staking-kpi', 'b'] }),
    );
    expect(readLegacyOrder('staking')).toEqual([
      'a',
      'feature: dashboard/staking-total-staked',
      'feature: dashboard/staking-apy',
      'feature: dashboard/staking-min-stake',
      'feature: dashboard/staking-rewards',
      'b',
    ]);
  });
});
