import { describe, expect, it } from 'vitest';

import {
  type RewardWindow,
  DEFAULT_REWARD_WINDOW,
  erasInWindow,
  isCustomWindowPending,
  isWindowReady,
  periodStart,
  windowBounds,
  windowEraRange,
  windowSlug,
} from '../reward-period';

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DEPTH = 84;

// Local-time days, the way the picker hands them over.
const JULY_1 = new Date(2026, 6, 1);
const JULY_31 = new Date(2026, 6, 31);
const AUGUST_20 = new Date(2026, 7, 20);
const AUGUST_21 = new Date(2026, 7, 21);
const AUGUST_22 = new Date(2026, 7, 22);

/** Looked at on 22 Aug at noon, local time. */
const NOW = new Date(2026, 7, 22, 12).getTime();

const july: RewardWindow = { period: 'custom', range: { from: JULY_1, to: JULY_31 } };
const halfPicked: RewardWindow = { period: 'custom', range: { from: JULY_1, to: undefined } };
const emptyCustom: RewardWindow = { period: 'custom', range: null };
const preset = (period: RewardWindow['period']): RewardWindow => ({ period, range: null });

const polkadot = { activeEra: 100, eraDurationMs: DAY_MS, historyDepth: HISTORY_DEPTH };
const kusama = { activeEra: 1000, eraDurationMs: DAY_MS / 4, historyDepth: HISTORY_DEPTH };

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

describe('erasInWindow (presets)', () => {
  it('counts a day per era on Polkadot', () => {
    expect(erasInWindow(preset('7d'), DAY_MS, HISTORY_DEPTH)).toBe(7);
    expect(erasInWindow(preset('30d'), DAY_MS, HISTORY_DEPTH)).toBe(30);
  });

  it('counts four eras a day on Kusama', () => {
    expect(erasInWindow(preset('7d'), DAY_MS / 4, HISTORY_DEPTH)).toBe(28);
  });

  it('never asks for more history than the chain keeps', () => {
    // 30 Kusama days would be 120 eras; nothing older than the depth is on
    // chain to attribute a reward to.
    expect(erasInWindow(preset('30d'), DAY_MS / 4, HISTORY_DEPTH)).toBe(HISTORY_DEPTH);
    expect(erasInWindow(preset('all'), DAY_MS, HISTORY_DEPTH)).toBe(HISTORY_DEPTH);
  });

  it('falls back to the full depth when the era duration is unknown', () => {
    expect(erasInWindow(preset('7d'), null, HISTORY_DEPTH)).toBe(HISTORY_DEPTH);
  });
});

describe('windowEraRange', () => {
  it('ends a preset at the last closed era and reaches back the period', () => {
    // The active era has not paid anything yet, so 99 is the newest era that counts.
    expect(windowEraRange(preset('7d'), polkadot, NOW)).toEqual({ eraFrom: 93, eraTo: 99 });
    expect(windowEraRange(preset('all'), polkadot, NOW)).toEqual({ eraFrom: 16, eraTo: 99 });
  });

  it('never reaches below era zero', () => {
    expect(windowEraRange(preset('all'), { ...polkadot, activeEra: 10 }, NOW)).toEqual({ eraFrom: 0, eraTo: 9 });
  });

  it('stops a past custom window at the eras that closed inside it', () => {
    // 1–31 Jul looked at on 22 Aug: the 21 full days of August that have
    // elapsed since the window ended are not part of it. The era straddling
    // each end is kept — era boundaries are only known to the day.
    expect(windowEraRange(july, polkadot, NOW)).toEqual({ eraFrom: 47, eraTo: 78 });
  });

  it('runs a window that reaches today up to the last closed era', () => {
    const thisWeek: RewardWindow = { period: 'custom', range: { from: AUGUST_20, to: AUGUST_22 } };

    expect(windowEraRange(thisWeek, polkadot, NOW)).toEqual({ eraFrom: 97, eraTo: 99 });
  });

  it('drops the eras of today from a window that ended yesterday on a four-era day', () => {
    const untilYesterday: RewardWindow = { period: 'custom', range: { from: AUGUST_20, to: AUGUST_21 } };

    // Noon is two Kusama eras into the day; the second one is wholly today.
    expect(windowEraRange(untilYesterday, kusama, NOW)).toEqual({ eraFrom: 990, eraTo: 998 });
  });

  it('has no eras until both ends of a custom range are picked', () => {
    // Nothing is fetched for a pending window; an open end would quietly read as "all time".
    expect(windowEraRange(halfPicked, polkadot, NOW)).toBeNull();
    expect(windowEraRange(emptyCustom, polkadot, NOW)).toBeNull();
  });

  it('has no eras for a window older than the history the chain keeps', () => {
    // 84 Kusama eras are 21 days; July is gone from the chain by 22 Aug.
    expect(windowEraRange(july, kusama, NOW)).toBeNull();
  });

  it('has no eras before the first one closes', () => {
    expect(windowEraRange(preset('7d'), { ...polkadot, activeEra: 0 }, NOW)).toBeNull();
  });

  it('falls back to the whole depth when the era duration is unknown', () => {
    expect(windowEraRange(july, { ...polkadot, eraDurationMs: null }, NOW)).toEqual({ eraFrom: 16, eraTo: 99 });
  });
});

describe('windowBounds', () => {
  it('covers both picked days in full, in unix seconds', () => {
    const { from, to } = windowBounds(july);

    expect(from).toBe(Math.floor(JULY_1.getTime() / 1000));
    // The last millisecond of the 31st — the next local midnight, minus one.
    expect(to).toBe(Math.floor((new Date(2026, 7, 1).getTime() - 1) / 1000));
  });

  it('keeps a half-picked range open-ended on the missing side', () => {
    expect(windowBounds(halfPicked)).toEqual({ from: Math.floor(JULY_1.getTime() / 1000), to: null });
    expect(windowBounds(emptyCustom)).toEqual({ from: null, to: null });
  });

  it('delegates presets to periodStart and never bounds them from above', () => {
    const now = new Date('2026-07-31T12:00:00Z');

    expect(windowBounds(preset('7d'), now)).toEqual({ from: periodStart('7d', now), to: null });
    expect(windowBounds(preset('all'), now)).toEqual({ from: null, to: null });
  });
});

describe('isWindowReady', () => {
  it('is true for every preset, the default included', () => {
    expect(isWindowReady(DEFAULT_REWARD_WINDOW)).toBe(true);
    expect(isWindowReady(preset('7d'))).toBe(true);
    expect(isWindowReady(preset('all'))).toBe(true);
  });

  it('is false for a custom window until both ends land', () => {
    expect(isWindowReady(emptyCustom)).toBe(false);
    expect(isWindowReady(halfPicked)).toBe(false);
    expect(isWindowReady(july)).toBe(true);
  });
});

describe('isCustomWindowPending', () => {
  it('is pending only for a custom window without both dates', () => {
    expect(isCustomWindowPending(emptyCustom)).toBe(true);
    expect(isCustomWindowPending(halfPicked)).toBe(true);
    expect(isCustomWindowPending(july)).toBe(false);
  });

  it('never holds a preset back, the default included', () => {
    expect(isCustomWindowPending(DEFAULT_REWARD_WINDOW)).toBe(false);
    expect(isCustomWindowPending(preset('7d'))).toBe(false);
    expect(isCustomWindowPending(preset('all'))).toBe(false);
  });
});

describe('windowSlug', () => {
  it('names presets by their period', () => {
    expect(windowSlug(preset('30d'))).toBe('30d');
    expect(windowSlug(preset('all'))).toBe('all');
  });

  it('names a full custom range by its local days', () => {
    expect(windowSlug(july)).toBe('from-2026-07-01-to-2026-07-31');
  });

  it('falls back to "custom" while the range is incomplete', () => {
    expect(windowSlug(halfPicked)).toBe('custom');
    expect(windowSlug(emptyCustom)).toBe('custom');
  });
});

describe('erasInWindow', () => {
  // Local midnights ten days apart, no DST change in between.
  const AUGUST_21_MIDNIGHT = new Date(2026, 7, 21).getTime();
  const AUG_11 = new Date(2026, 7, 11);
  const AUG_15 = new Date(2026, 7, 15);

  it('replays the eras since a past window started, not only those inside it', () => {
    const pastWindow: RewardWindow = { period: 'custom', range: { from: AUG_11, to: AUG_15 } };

    expect(erasInWindow(pastWindow, DAY_MS, HISTORY_DEPTH, AUGUST_21_MIDNIGHT)).toBe(10);
    expect(erasInWindow(pastWindow, DAY_MS / 4, HISTORY_DEPTH, AUGUST_21_MIDNIGHT)).toBe(40);
  });

  it('costs at least one era for a window that starts today', () => {
    const today = new Date(2026, 7, 21);

    expect(
      erasInWindow({ period: 'custom', range: { from: today, to: today } }, DAY_MS, HISTORY_DEPTH, AUGUST_21_MIDNIGHT),
    ).toBe(1);
  });

  it('asks for the full depth when the start is not picked yet', () => {
    expect(erasInWindow(emptyCustom, DAY_MS, HISTORY_DEPTH, AUGUST_21_MIDNIGHT)).toBe(HISTORY_DEPTH);
  });

  it('never asks for more history than the chain keeps', () => {
    const longAgo: RewardWindow = { period: 'custom', range: { from: new Date(2025, 0, 1), to: AUG_15 } };

    expect(erasInWindow(longAgo, DAY_MS, HISTORY_DEPTH, AUGUST_21_MIDNIGHT)).toBe(HISTORY_DEPTH);
  });

  it('falls back to the full depth when the era duration is unknown', () => {
    expect(erasInWindow(july, null, HISTORY_DEPTH, AUGUST_21_MIDNIGHT)).toBe(HISTORY_DEPTH);
  });
});
