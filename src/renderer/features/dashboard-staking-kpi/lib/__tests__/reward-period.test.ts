import { describe, expect, it } from 'vitest';

import { erasInPeriod, periodStart } from '../reward-period';

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DEPTH = 84;

describe('periodStart', () => {
  it('anchors to UTC midnight so the key does not move with the clock', () => {
    const morning = periodStart('7d', new Date('2026-07-31T06:15:00Z'));
    const evening = periodStart('7d', new Date('2026-07-31T23:59:00Z'));

    expect(morning).toBe(evening);
  });

  it('covers the requested number of days, today included', () => {
    const start = periodStart('7d', new Date('2026-07-31T12:00:00Z'))!;

    expect(new Date(start * 1000).toISOString()).toBe('2026-07-25T00:00:00.000Z');
  });

  it('has no lower bound for all time', () => {
    expect(periodStart('all')).toBeUndefined();
  });
});

describe('erasInPeriod', () => {
  it('counts a day per era on Polkadot', () => {
    expect(erasInPeriod('7d', DAY_MS, HISTORY_DEPTH)).toBe(7);
    expect(erasInPeriod('30d', DAY_MS, HISTORY_DEPTH)).toBe(30);
  });

  it('counts four eras a day on Kusama', () => {
    expect(erasInPeriod('7d', DAY_MS / 4, HISTORY_DEPTH)).toBe(28);
  });

  it('never asks for more history than the chain keeps', () => {
    // 30 Kusama days would be 120 eras; nothing older than the depth is on
    // chain to attribute a reward to.
    expect(erasInPeriod('30d', DAY_MS / 4, HISTORY_DEPTH)).toBe(HISTORY_DEPTH);
    expect(erasInPeriod('all', DAY_MS, HISTORY_DEPTH)).toBe(HISTORY_DEPTH);
  });

  it('falls back to the full depth when the era duration is unknown', () => {
    expect(erasInPeriod('7d', null, HISTORY_DEPTH)).toBe(HISTORY_DEPTH);
  });
});
